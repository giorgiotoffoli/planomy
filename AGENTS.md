# Repository guidance

## Package management

- Use pnpm exclusively for dependency management and package scripts.
- Install dependencies with `pnpm install`.
- Run package scripts with `pnpm <script>`.
- Run one-off packages with `pnpm dlx <package>`.
- Do not use npm, npx, Yarn, or Bun, and do not create their lockfiles.
- Preserve `pnpm-lock.yaml` and update it whenever dependencies change.
