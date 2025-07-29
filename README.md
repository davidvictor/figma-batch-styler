# Batch Styler

A Figma plugin for batch operations on text and color styles, including support for Figma variables.

## Features

### Text Styles
- Create and update multiple text styles at once
- Batch edit font properties (family, size, weight, line height, letter spacing)
- Apply text transforms (uppercase, lowercase, capitalize)
- Link text styles to Figma variables
- Support for variable modes and collections

### Color Styles
- Create and update multiple color styles simultaneously
- Advanced color editing with HSL adjustments
- Batch operations: lighten, darken, saturate, desaturate
- Direct hex color input
- Link color styles to Figma variables
- Variable mode switching support

### Recent Updates
- **Variable Support**: Added comprehensive Figma variable integration for both text and color styles
- **Improved Selection**: Fixed style selection leakage between different style types
- **Enhanced UI**: Better handling of variable modes and collections
- **Bug Fixes**: Resolved error handling issues and style updating problems

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your system
- Figma desktop app

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Import in Figma:
   - Open Figma
   - Go to `Plugins` → `Development` → `Import plugin from manifest`
   - Select the `manifest.json` file in the `public` folder

## Development

### Running in Development Mode
1. Start the development server:
   ```bash
   npm run dev
   ```

2. The development server will watch for changes and rebuild automatically

3. In Figma:
   - Make sure the plugin is already imported (see Installation)
   - Run the plugin from `Plugins` → `Development` → `Metamodern Batch Styler`
   - The plugin will reload when you make changes to the code

### Project Structure
- `src/code.ts` - Main plugin logic (runs in Figma's sandbox)
- `src/PluginUI.svelte` - Main UI component
- `src/TextStyles.svelte` - Text styles management
- `src/ColorStyles.svelte` - Color styles management
- `src/helpers.ts` - Shared utilities
- `src/color-helpers.js` - Color conversion utilities

### Build Commands
- `npm run dev` - Start development server with hot reload
- `npm run build` - Create production build
- `npm run start` - Serve the public directory

## Usage

1. Open the plugin in Figma
2. Select either "Text Styles" or "Color Styles" tab
3. Choose styles to edit or create new ones
4. Apply batch operations:
   - For text: adjust font properties, apply transforms, link to variables
   - For colors: adjust HSL values, apply color operations, link to variables
5. Click "Update" to apply changes

## Technical Details

- Built with Svelte and TypeScript
- Uses Rollup for bundling
- Integrates with Figma's plugin API
- Supports Figma variables API for dynamic styling
