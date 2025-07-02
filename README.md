# local-task

A lightweight CLI task manager for npm projects using SQLite for local storage.

## Features

- **Category-based Organization**: Organize tasks into custom categories
- **SQLite Storage**: Local database storage with no external dependencies
- **Flexible Task Management**: Add, update, search, and track task status
- **JSON Integration**: Import/export tasks in JSON format
- **Status Tracking**: Mark tasks as work-in-progress (wip) or done
- **Search Capabilities**: Full-text search across task names and descriptions

## Installation

```bash
npm install local-task
```

## Quick Start

1. Initialize the database in your project:

```bash
npx local-task init
```

2. Add some tasks:

```bash
npx local-task add backend '[{"customId": "api-001", "name": "Create user API", "description": "Implement user CRUD operations"}]'
```

3. List your tasks:

```bash
npx local-task show backend
```

## Commands

### Database Management

#### `init [--force]`

Initialize the database in your project root. Creates `tasks.db` file.

- `--force`: Recreate database if it already exists

```bash
npx local-task init
npx local-task init --force
```

### Task Management

#### `add <category> <jsonArray>`

Add or update tasks in a specific category. Tasks are upserted based on `customId`.

```bash
npx local-task add backend '[
  {
    "customId": "api-001",
    "name": "Create user API",
    "description": "Implement user CRUD operations"
  },
  {
    "customId": "auth-001", 
    "name": "Implement authentication",
    "description": "Add JWT-based authentication"
  }
]'
```

#### `get <category> <id|customId>`

Retrieve a specific task by ID or custom ID.

```bash
npx local-task get backend api-001
npx local-task get backend 1
```

#### `list <category>`

List all tasks in a category (JSON format).

```bash
npx local-task list backend
```

#### `show <category>`

Display tasks in a formatted table.

```bash
npx local-task show backend
```

### Task Status

#### `todo <category>`

List tasks with "wip" (work-in-progress) status.

```bash
npx local-task todo backend
```

#### `done <category> <id> [comment]`

Mark a task as completed with optional comment.

```bash
npx local-task done backend 1 "API implementation completed"
npx local-task done backend "api-001"
```

#### `wip <category> <id> [comment]`

Mark a task as work-in-progress with optional comment.

```bash
npx local-task wip backend 1 "Starting API development"
```

### Search and Remove

#### `search <category> <query>`

Search tasks by customId, name, or description.

```bash
npx local-task search backend API
npx local-task search backend auth
```

#### `remove <category> <id>`

Remove a task by ID.

```bash
npx local-task remove backend 1
```

## Task Structure

Each task contains the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Auto-incrementing primary key |
| `customId` | string | User-defined unique identifier |
| `category` | string | Task category |
| `name` | string | Task name |
| `description` | string | Detailed description |
| `status` | string | Either "wip" or "done" |
| `comment` | string | Additional comments |
| `createdAt` | timestamp | Creation time |
| `updatedAt` | timestamp | Last update time |

## Use Cases

### Project Planning

```bash
# Initialize and add project tasks
npx local-task init
npx local-task add frontend '[{"customId": "ui-001", "name": "Design homepage"}]'
npx local-task add backend '[{"customId": "db-001", "name": "Setup database"}]'
```

### Development Workflow

```bash
# Start working on a task
npx local-task wip frontend ui-001 "Starting homepage design"

# Check current work
npx local-task todo frontend

# Complete a task
npx local-task done frontend ui-001 "Homepage design completed"
```

### Team Coordination

```bash
# View all project tasks
npx local-task show backend
npx local-task show frontend

# Search for specific features
npx local-task search backend authentication
```

## Development

This project is built with:

- **TypeScript** for type safety
- **SQLite** with Drizzle ORM for data persistence
- **tsdown** for building
- **Vitest** for testing
- **Biome** for linting and formatting

### Build Commands

```bash
pnpm build      # Production build
pnpm typecheck  # Type checking
pnpm lint       # Linting
pnpm test       # Run tests
```

## License

MIT
