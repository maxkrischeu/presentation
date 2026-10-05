// Public lifecycle bootstrap for other formats in the same Quarto project.
import { prepareHooks } from './register.ts';
await prepareHooks(Deno.args[0]);
