// Minimal Chrome DevTools transport for one isolated PDF page.
import { join } from "stdlib/path";
import { decodeBase64 } from "stdlib/base64";

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export async function openPage(executable: string) {
  const profile = await Deno.makeTempDir({ prefix: "presentation-pdf-" });
  let child: Deno.ChildProcess | undefined, socket: WebSocket | undefined;
  let exited = false, errors = "", nextId = 0, session = "";
  const pending = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timer: number;
    }
  >();
  const rejectAll = () => {
    for (const item of pending.values()) {
      clearTimeout(item.timer);
      item.reject(Error("PDF browser disconnected."));
    }
    pending.clear();
  };
  const close = async () => {
    rejectAll();
    socket?.close();
    if (child && !exited) {
      try {
        child.kill("SIGTERM");
      } catch {}
    }
    if (child) {
      const timer = setTimeout(() => {
        try {
          child!.kill("SIGKILL");
        } catch {}
      }, 3000);
      try {
        await child.status;
      } finally {
        clearTimeout(timer);
      }
    }
    await Deno.remove(profile, { recursive: true }).catch(() => {});
  };
  const send = (
    method: string,
    params: any = {},
    target = session,
  ): Promise<any> =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(Error("PDF browser timed out: " + method));
      }, 90000);
      pending.set(id, { resolve, reject, timer });
      try {
        socket!.send(
          JSON.stringify({
            id,
            method,
            params,
            ...(target ? { sessionId: target } : {}),
          }),
        );
      } catch (error) {
        clearTimeout(timer);
        pending.delete(id);
        reject(error);
      }
    });
  try {
    child = new Deno.Command(executable, {
      args: [
        "--headless",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--remote-debugging-port=0",
        "--remote-debugging-address=127.0.0.1",
        "--user-data-dir=" + profile,
        "about:blank",
      ],
      stdin: "null",
      stdout: "null",
      stderr: "piped",
    }).spawn();
    child.status.then(() => {
      exited = true;
      rejectAll();
    });
    // Drain stderr without unbounded buffering or exposing successful browser chatter.
    void (async () => {
      for await (const bytes of child!.stderr) {
        errors = (errors + new TextDecoder().decode(bytes)).slice(-2000);
      }
    })();
    const started = Date.now();
    let address = "";
    while (!address) {
      if (exited || Date.now() - started > 30000) {
        throw Error("PDF browser failed to start. " + errors);
      }
      try {
        const [port, path] =
          (await Deno.readTextFile(join(profile, "DevToolsActivePort"))).trim()
            .split(/\r?\n/);
        if (/^\d+$/.test(port) && path?.startsWith("/devtools/browser/")) {
          address = "ws://127.0.0.1:" + port + path;
        }
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) throw error;
      }
      if (!address) await pause(50);
    }
    socket = new WebSocket(address);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error("PDF browser connection timed out.")),
        10000,
      );
      socket!.onopen = () => {
        clearTimeout(timer);
        resolve();
      };
      socket!.onerror = () => {
        clearTimeout(timer);
        reject(Error("PDF browser connection failed."));
      };
    });
    socket.onclose = rejectAll;
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data), item = pending.get(message.id);
      if (!item) return;
      pending.delete(message.id);
      clearTimeout(item.timer);
      if (message.error) item.reject(Error(message.error.message));
      else item.resolve(message.result);
    };
    const { targetId } = await send("Target.createTarget", {
      url: "about:blank",
    }, "");
    session =
      (await send("Target.attachToTarget", { targetId, flatten: true }, ""))
        .sessionId;
    await send("Page.enable");
    await send("Runtime.enable");
    const evaluate = async (expression: string) => {
      const result = await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) {
        throw Error(
          result.exceptionDetails.exception?.description ||
            result.exceptionDetails.text,
        );
      }
      return result.result.value;
    };
    return {
      close,
      evaluate,
      init: (source: string) =>
        send("Page.addScriptToEvaluateOnNewDocument", { source }),
      async goto(url: string) {
        const result = await send("Page.navigate", { url });
        if (result.errorText) throw Error(result.errorText);
        const deadline = Date.now() + 60000;
        while (Date.now() < deadline) {
          if (
            await evaluate(
              "document.readyState === 'complete' && !!window.Reveal?.isReady() && !!document.querySelector('.pdf-page')",
            )
          ) return;
          await pause(100);
        }
        throw Error("Presentation did not become ready for PDF export.");
      },
      async pdf() {
        const result = await send("Page.printToPDF", {
          printBackground: true,
          preferCSSPageSize: true,
        });
        return decodeBase64(result.data);
      },
    };
  } catch (error) {
    await close();
    throw error;
  }
}
