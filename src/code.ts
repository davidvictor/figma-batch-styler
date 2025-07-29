import {
  hslToRgb,
  rgbToHsl,
  figmaRGBToHex,
  hexToFigmaRGB,
} from "./color-helpers.js";
import {
  convertLetterSpacingToFigma,
  convertLineHeightToFigma,
} from "./helpers";

// This plugin will open a modal to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser enviroment (see documentation).

// This shows the HTML page in "ui.html".
figma.showUI(__html__, {
  width: 540,
  height: 780,
});

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.

async function sendStyles({ figmaTextStyles = [], figmaColorStyles = [] }) {
  let colorStyles = figmaColorStyles
    .map((s) => {
      if (s.paints.length && s.paints[0].type === "SOLID") {
        const { r, g, b } = s.paints.length && s.paints[0].color;
        const color = {
          r: r * 255,
          g: g * 255,
          b: b * 255,
        };
        const { name, description, paints, id } = s;
        return { name, description, paints, id, color };
      }
    })
    .filter((n) => n);
  let textStyles = figmaTextStyles.map((s) => {
    const { name, description, fontName, fontSize, id } = s;
    let lineHeight;
    if (s.lineHeight.unit === "AUTO") {
      lineHeight = "AUTO";
    } else if (s.lineHeight.unit === "PERCENT") {
      let value = Math.round(s.lineHeight.value * 100) / 100;
      lineHeight = `${value}%`;
    } else {
      lineHeight = Math.round(s.lineHeight.value * 100) / 100;
    }
    let letterSpacing;
    if (s.letterSpacing.unit === "PERCENT") {
      let value = Math.round(s.letterSpacing.value * 100) / 100;
      letterSpacing = `${value}%`;
    } else {
      letterSpacing = Math.round(s.letterSpacing.value * 100) / 100;
    }
    return {
      name,
      description,
      fontName,
      fontSize,
      lineHeight,
      letterSpacing,
      id,
    };
  });

  let availableFonts = await figma.listAvailableFontsAsync();

  // Fetch available variables
  let variables = [];
  try {
    const collections =
      await figma.variables.getLocalVariableCollectionsAsync();
    const allVariables = await figma.variables.getLocalVariablesAsync();

    variables = allVariables.map((variable) => ({
      id: variable.id,
      name: variable.name,
      resolvedType: variable.resolvedType,
      valuesByMode: variable.valuesByMode,
      collectionId: variable.variableCollectionId,
      collectionName:
        collections.find((c) => c.id === variable.variableCollectionId)?.name ||
        "",
    }));
  } catch (error) {
    console.error("Error fetching variables:", error);
  }

  figma.ui.postMessage({
    type: "postStyles",
    textStyles,
    colorStyles,
    availableFonts,
    variables,
  });
}

function getStyles() {
  const figmaTextStyles = figma.getLocalTextStyles();
  const figmaColorStyles = figma.getLocalPaintStyles();
  if (figmaTextStyles.length || figmaColorStyles.length) {
    sendStyles({ figmaTextStyles, figmaColorStyles });
  } else {
    sendStyles({});
  }
  return;
}

async function updateTextStyles({
  selectedStyles,
  styleName,
  styleMatch,
  description,
  familyName,
  fontWeight,
  fontSize,
  lineHeight,
  letterSpacing,
  fontMappings,
  variableBindings,
}) {
  let localStyles = figma.getLocalTextStyles();

  return selectedStyles.map(async (selectedStyle, idx) => {
    let hit = localStyles.find((s) => s.id === selectedStyle.id);

    // Handle variable bindings
    if (variableBindings) {
      for (const [field, variableId] of Object.entries(variableBindings)) {
        if (variableId) {
          try {
            const variable =
              await figma.variables.getVariableByIdAsync(variableId);
            if (
              (field === "fontWeight" || field === "fontFamily") &&
              variable &&
              variable.resolvedType === "STRING"
            ) {
              // For font weight and family, bind STRING variables
              hit.setBoundVariable(field, variable);
            } else if (variable && variable.resolvedType === "FLOAT") {
              hit.setBoundVariable(field, variable);
            }
          } catch (error) {
            console.error(`Error binding variable to ${field}:`, error);
          }
        }
      }
    }

    // Handle direct values (existing logic)
    let newLineHeight;
    let newLetterSpacing;
    let newFontSize;

    // Only apply direct values if no variable is bound
    if (!variableBindings?.fontSize && fontSize) {
      newFontSize = Number(
        fillToLengthOfSelected(fontSize, selectedStyles)[idx],
      );
    }

    if (!variableBindings?.lineHeight && lineHeight) {
      newLineHeight = convertLineHeightToFigma(
        fillToLengthOfSelected(lineHeight, selectedStyles)[idx],
      );
    }

    if (!variableBindings?.letterSpacing && letterSpacing) {
      newLetterSpacing = convertLetterSpacingToFigma(
        fillToLengthOfSelected(letterSpacing, selectedStyles)[idx],
      );
    }

    let style;
    if (!variableBindings?.fontWeight) {
      if (fontMappings) {
        let mapping = fontMappings.find(
          (mapping) => mapping.currentWeight === selectedStyle.fontName.style,
        );
        style = mapping.newWeight;
      } else {
        style = fontWeight ? fontWeight : selectedStyle.fontName.style;
      }
    } else {
      // When using variable for weight, keep the current style for loading
      style = selectedStyle.fontName.style;
    }
    let family =
      !variableBindings?.fontFamily && familyName
        ? familyName
        : selectedStyle.fontName.family;

    await figma.loadFontAsync({ family, style });

    if (styleMatch !== null && styleName !== undefined) {
      hit.name = hit.name.replace(styleMatch, styleName);
    } else if (styleName) {
      hit.name = styleName;
    }
    if (description !== null) {
      hit.description = description;
    }

    // Only set fontName if not using variables for weight or family
    if (!variableBindings?.fontWeight && !variableBindings?.fontFamily) {
      hit.fontName = {
        family,
        style,
      };
    } else if (
      !variableBindings?.fontFamily &&
      familyName &&
      familyName !== selectedStyle.fontName.family
    ) {
      // If only family changed (not using variable), update just the family
      hit.fontName = {
        family,
        style: variableBindings?.fontWeight
          ? selectedStyle.fontName.style
          : style,
      };
    } else if (!variableBindings?.fontWeight && variableBindings?.fontFamily) {
      // If using variable for family but not weight, only update style if changed
      if (style !== selectedStyle.fontName.style) {
        hit.fontName = {
          family: selectedStyle.fontName.family,
          style,
        };
      }
    }

    // Only set direct values if no variable is bound
    if (!variableBindings?.fontSize && newFontSize) {
      hit.fontSize = newFontSize;
    } else if (!variableBindings?.fontSize) {
      hit.fontSize = selectedStyle.fontSize;
    }

    if (!variableBindings?.lineHeight) {
      hit.lineHeight = newLineHeight
        ? { ...newLineHeight }
        : { ...convertLineHeightToFigma(selectedStyle.lineHeight) };
    }

    if (!variableBindings?.letterSpacing) {
      hit.letterSpacing = newLetterSpacing
        ? { ...newLetterSpacing }
        : { ...convertLetterSpacingToFigma(selectedStyle.letterSpacing) };
    }

    return hit;
  });
}

function convertToHsl(color) {
  const { r, g, b } = color;
  let rawHsl = rgbToHsl(r * 255, g * 255, b * 255);
  let [h, s, l] = rawHsl;
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  return { h, s, l };
}

function convertToRgb(color) {
  const { h, s, l } = color;
  let rawRgb = hslToRgb(h / 360, s / 100, l / 100);
  let [r, g, b] = rawRgb;
  r = r / 255;
  g = g / 255;
  b = b / 255;
  return { r, g, b };
}

function getColors(style) {
  let paints = style.paints.filter((n) => n.type === "SOLID");
  if (!paints) return;
  return paints[0].color;
}

function getHslFromStyle(style) {
  let color = getColors(style);
  let { h, s, l } = convertToHsl(color);
  return { h, s, l };
}

function fillToLengthOfSelected(property, styles) {
  return new Array(styles.length)
    .fill(
      String(property)
        .split(",")
        .map((i) => i.trim()),
    )
    .flat()
    .slice(0, styles.length);
}

async function updateColorStyles({
  selectedStyles,
  styleName,
  styleMatch,
  description,
  hue,
  saturation,
  lightness,
  alpha,
  hex,
  useColorVariable,
  colorVariableId,
}) {
  let localStyles = figma.getLocalPaintStyles();

  return selectedStyles.map(async (selectedStyle, idx) => {
    let hit = localStyles.find((s) => s.id === selectedStyle.id);

    if (useColorVariable && colorVariableId) {
      // Bind to variable
      try {
        const variable =
          await figma.variables.getVariableByIdAsync(colorVariableId);
        if (variable && variable.resolvedType === "COLOR") {
          const currentPaint = hit.paints[0];
          const opacity = alpha
            ? Number(fillToLengthOfSelected(alpha, selectedStyles)[idx])
            : currentPaint.opacity;

          // Create a new paint bound to the variable
          const newPaint = figma.variables.setBoundVariableForPaint(
            { type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity },
            "color",
            variable,
          );
          hit.paints = [newPaint];
        }
      } catch (error) {
        console.error("Error binding variable to color style:", error);
      }
    } else {
      // Use direct color values (existing logic)
      let { h, s, l } = getHslFromStyle(selectedStyle);
      let newHue =
        hue == undefined
          ? h
          : Number(fillToLengthOfSelected(hue, selectedStyles)[idx]);
      let newSaturation =
        saturation == undefined
          ? s
          : Number(fillToLengthOfSelected(saturation, selectedStyles)[idx]);
      let newLightness =
        lightness == undefined
          ? l
          : Number(fillToLengthOfSelected(lightness, selectedStyles)[idx]);
      let newColor;
      if (hex) {
        newColor = hexToFigmaRGB(
          fillToLengthOfSelected(hex, selectedStyles)[idx],
        );
      } else {
        newColor = convertToRgb({
          h: newHue,
          s: newSaturation,
          l: newLightness,
        });
      }
      let opacity = alpha
        ? Number(fillToLengthOfSelected(alpha, selectedStyles)[idx])
        : selectedStyle.paints[0].opacity;
      hit.paints = [{ color: newColor, type: "SOLID", opacity }];
    }

    if (styleMatch !== null && styleName !== undefined) {
      hit.name = hit.name.replace(styleMatch, styleName);
    } else if (styleName) {
      hit.name = styleName;
    }
    if (description !== null) {
      hit.description = description;
    }
    return hit;
  });
}

async function removeStyles({ selectedStyles }) {
  try {
    let textStyles = figma.getLocalTextStyles();
    let paintStyles = figma.getLocalPaintStyles();
    const styles = [...textStyles, ...paintStyles];

    selectedStyles.map((style) => {
      const found = styles.find((s) => s.id === style.id);
      if (found) {
        found.remove();
      }
    });
    figma.notify(`Successfully removed ${selectedStyles.length} styles`);
  } catch (e) {
    figma.notify("Encountered an error, full output in console");
    console.error(e);
  }
  getStyles();
}

async function updateStyles({
  selectedStyles,
  styleName,
  styleMatch,
  description,
  hue,
  saturation,
  lightness,
  alpha,
  hex,
  familyName,
  fontWeight,
  fontSize,
  lineHeight,
  letterSpacing,
  fontMappings,
  variant,
  useColorVariable,
  colorVariableId,
  variableBindings,
}) {
  let styleChanges;

  try {
    if (variant === "COLOR") {
      styleChanges = updateColorStyles({
        selectedStyles,
        styleName,
        styleMatch,
        description,
        hue,
        saturation,
        lightness,
        alpha,
        hex,
        useColorVariable,
        colorVariableId,
      });
      figma.notify(
        `Successfully updated ${selectedStyles.length} color styles`,
      );
    } else {
      styleChanges = updateTextStyles({
        selectedStyles,
        styleName,
        styleMatch,
        description,
        familyName,
        fontWeight,
        fontSize,
        lineHeight,
        letterSpacing,
        fontMappings,
        variableBindings,
      });
      figma.notify(`Successfully updated ${selectedStyles.length} text styles`);
    }

    await Promise.all(styleChanges);
  } catch (e) {
    figma.notify("Encountered an error, full output in console");
    console.error(e);
  }
  getStyles();
}

figma.ui.onmessage = (msg) => {
  if (msg.type === "update") {
    updateStyles(msg);
    return;
  }
  if (msg.type === "remove") {
    removeStyles(msg);
    return;
  }
  if (msg.type === "refresh") {
    getStyles();

    return;
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  figma.closePlugin();
};
