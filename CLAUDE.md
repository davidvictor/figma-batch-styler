# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Figma plugin called "Batch Styler" that allows batch operations on text and color styles in Figma designs. The plugin uses Svelte for the UI and TypeScript for the main plugin logic.

## Commands

### Development
```bash
npm run dev    # Start development server with hot reload
npm run build  # Create production build
npm run start  # Serve the public directory
```

### Installation & Setup
```bash
npm install    # Install dependencies
```

To test the plugin in Figma:
1. Run `npm run build`
2. In Figma: Plugins → Development → Import plugin from manifest
3. Select the `manifest.json` file in the `public` folder

## Architecture

### Build System
The project uses Rollup with a dual-build configuration:
1. **UI Bundle**: Compiles Svelte components and inlines everything into `public/index.html`
2. **Plugin Code**: Compiles `src/code.ts` to `public/code.js` for Figma's plugin runtime

### Key Files
- `src/code.ts` - Main plugin logic that runs in Figma's sandbox environment. Handles all Figma API interactions and communicates with the UI via postMessage
- `src/PluginUI.svelte` - Main UI component that orchestrates the plugin interface
- `src/TextStyles.svelte` - Text styles management functionality
- `src/ColorStyles.svelte` - Color styles management functionality
- `src/helpers.ts` - Shared TypeScript utilities for the plugin code
- `src/color-helpers.js` - Color conversion utilities (hex, RGB, HSL)

### Communication Flow
The plugin uses Figma's message passing system:
- UI → Plugin: `parent.postMessage({ pluginMessage: {...} }, '*')`
- Plugin → UI: `figma.ui.postMessage({...})`

Common message types include:
- `fetch` - Request data from Figma
- `update` - Apply changes to styles
- `createStyles` - Batch create new styles
- `cancel` - Close the plugin

### Dependencies
- **figma-plugin-ds-svelte** - Provides Figma-styled UI components
- **svelte-color** - Color picker functionality
- **simple-svelte-autocomplete** - Autocomplete for style selection

## Important Notes

- The plugin integrates with Amplitude for analytics tracking
- No testing framework is configured
- No linting tools are set up
- The manifest.json contains the plugin ID (818203235789864127) which should not be changed
- All UI code must be bundled into index.html as Figma plugins don't support external resources