# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`local-task` is a TypeScript CLI tool for npm project task management.

## Development Commands

### Build and Development

- `pnpm build` - Production build with tsdown
- `pnpm typecheck` - TypeScript type checking

### Code Quality

- `pnpm lint` - Check code with Biome linter
- `pnpm lint:fix` - Auto-fix linting issues
- `pnpm format` - Format code with Biome
- `pnpm format:check` - Check code formatting

### Testing

- `pnpm test` - Run all tests with Vitest
- `pnpm test -- --watch` - Run tests in watch mode

## Workflow

Run `pnpm typecheck` , `pnpm run lint:fix` and `pnpm run format` after making changes to ensure code quality and consistency.

## Architecture

### Tech Stack

- **Runtime**: Node.js 22
- **Bundler**: tsdown
- **Testing**: Vitest
- **Database**: SQLite with Drizzle ORM
- **Validation**: Zod 4 （ import { z } from "zod/v4"; is valid for zod@^3）

### Key Patterns

- ESM-first with strict TypeScript configuration
- CLI tool architecture with binary entry point
- Development environment managed via Nix flake (Node.js 22 + pnpm)
- Zero runtime dependencies for lightweight distribution

### Build Configuration

- Entry: `./src/index.ts`
- Platform-neutral output
- Generates `.d.ts` declarations for TypeScript consumers
- Configured as CLI with proper binary setup in package.json

