export async function main() {
  // orchestrator lifecycle is implemented in Plan 5 Task 12
}

// Guarded entrypoint: only run when executed directly, not when imported by tests.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('whatsapp-app failed to start', err);
    process.exit(1);
  });
}
