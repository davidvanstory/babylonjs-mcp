# Babylon.js MCP Server

An MCP (Model Context Protocol) server that allows AI assistants like Claude to create and manipulate 3D objects in a Babylon.js scene through text commands.

## Features

- Create 3D objects (box, sphere, cylinder, cone, torus) with customizable properties
- Delete objects by name
- Select objects for highlighting
- List all objects in the scene
- Real-time WebSocket communication between MCP server and browser
- React and vanilla JavaScript implementations

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Claude Desktop │────▶│   MCP Server     │────▶│  Browser App    │
│                 │     │  (stdio + WS)    │     │  (Babylon.js)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd babylonjs-mcpV2
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Usage

### 1. Start the MCP Server

The MCP server needs to be running to bridge communication between Claude and the browser:

```bash
node dist/mcp-stdio-server.js
```

This will:
- Start the MCP server listening on stdio
- Start a WebSocket server on port 8080

### 2. Start the Browser Application

In a new terminal, start the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser. You should see:
- A 3D canvas with a ground plane
- A command input interface
- A WebSocket connection status indicator

### 3. Configure Claude Desktop

Add the following to your Claude Desktop configuration:

**On macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**On Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "babylonjs": {
      "command": "node",
      "args": ["/absolute/path/to/babylonjs-mcpV2/dist/mcp-stdio-server.js"]
    }
  }
}
```

Replace `/absolute/path/to/babylonjs-mcpV2` with the actual path to your project.

### 4. Test the Connection

1. Restart Claude Desktop
2. Make sure the browser app shows "Connected" status
3. In Claude, you can now use commands like:
   - "Create a red box named myBox"
   - "Delete myBox"
   - "List all objects"
   - "Select myBox"

## Available Commands

The MCP server exposes the following tools:

- **create_object**: Create a 3D object
  - `shape`: box, sphere, cylinder, cone, or torus
  - `name`: unique identifier for the object
  - `position`: (optional) {x, y, z} coordinates
  - `size`: (optional) scale factor
  - `color`: (optional) {r, g, b} values (0-1)

- **delete_object**: Remove an object by name
  - `name`: identifier of the object to delete

- **select_object**: Highlight an object
  - `name`: identifier of the object to select

- **list_objects**: Get all objects in the scene

## Development

### Project Structure

```
src/
├── core/                 # Core business logic
│   ├── babylon-scene.ts  # 3D scene management
│   ├── command-parser.ts # Text command parsing
│   ├── mcp-server.ts     # MCP server implementation
│   ├── websocket-client.ts # WebSocket client for browser
│   └── types.ts          # TypeScript types
├── react/                # React components
│   └── BabylonMCP.tsx    # Main React component
├── vanilla/              # Vanilla JS implementation
│   └── index.ts          # Browser entry point
├── mcp-stdio-server.ts   # MCP server executable
└── App.tsx               # React demo app
```

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build everything
- `npm run build:server` - Build MCP server only
- `npm run typecheck` - Run TypeScript type checking
- `npm run test:simple` - Serve vanilla HTML test page

### Testing Without Claude

You can test the browser application standalone:

1. Start only the dev server: `npm run dev`
2. Open http://localhost:3000
3. Use the command input to test locally (WebSocket connection will show as disconnected)

## Troubleshooting

### WebSocket Connection Issues

1. Make sure the MCP server is running (`node dist/mcp-stdio-server.js`)
2. Check that port 8080 is not in use by another application
3. Look for errors in the browser console
4. Check the MCP server logs in the terminal

### Claude Desktop Not Finding the Server

1. Ensure the path in `claude_desktop_config.json` is absolute
2. Make sure the MCP server file exists at the specified path
3. Restart Claude Desktop after configuration changes
4. Check Claude Desktop logs for MCP-related errors

### Build Errors

1. Make sure all dependencies are installed: `npm install`
2. Clear the dist folder and rebuild: `rm -rf dist && npm run build`
3. Check TypeScript errors: `npm run typecheck`

## License

MIT