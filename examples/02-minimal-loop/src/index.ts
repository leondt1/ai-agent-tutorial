import { runAgent } from "./run-agent.js";

async function main() {
  const userInput = "这个项目怎么安装？";
  const result = await runAgent(userInput);

  console.log("\nFinal answer:");
  console.log(result.answer);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
