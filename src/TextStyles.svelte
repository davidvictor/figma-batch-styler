<script>
  import { GlobalCSS } from "figma-plugin-ds-svelte";
  import AutoComplete from "simple-svelte-autocomplete";
  import Input from "./Input.svelte";
  import Selector from "./Selector.svelte";
  import MissingWeightsDialog from "./MissingWeightsDialog.svelte";
  import {
    convertLetterSpacingToFigma,
    convertLineHeightToFigma
  } from "./helpers.ts";

  import {
    Button,
    Icon,
    IconButton,
    Label,
    Type,
    Section,
    SelectMenu,
    Switch,
    IconWarning
  } from "figma-plugin-ds-svelte";

  export let styles = [];
  export let availableFamilies = [];
  export let sendToUI;
  export let variables = [];
  let styleFilter = "",
    currentFamily = [],
    availableFontNames = [],
    availableWeights = [],
    hasAllWeightsAvailable = true,
    selectedStyles = [],
    fontWeight = "",
    newFontWeights = [],
    familyName,
    styleName = "",
    styleMatch,
    description = "",
    fontSize,
    lineHeight,
    letterSpacing,
    weightsDialogVisible = false,
    loading = true,
    variableBindings = {},
    useVariableForSize = false,
    useVariableForLineHeight = false,
    useVariableForLetterSpacing = false,
    useVariableForWeight = false,
    useVariableForFamily = false;

  $: disabled = !selectedStyles.length;
  $: hasMixedFontSizes = fontSize && fontSize.includes(", ");
  $: hasMixedLineHeights = lineHeight && lineHeight.includes(", ");
  $: hasMixedLetterSpacing = letterSpacing && letterSpacing.includes(", ");
  $: hasMixedFontWeights = fontWeight && fontWeight.includes(", ");
  $: hasMixedFontFamilies = familyName && familyName.includes(", ");
  $: {
    availableWeights = currentFamily.map(n => n.fontName.style);
  }
  $: {
    availableFontNames = [
      ...new Set(availableFamilies.map(n => n.fontName.family))
    ];
  }
  $: {
    currentFamily = availableFamilies.filter(
      n => n.fontName.family === familyName
    );
  }
  $: {
    hasAllWeightsAvailable = fontWeight
      ? fontWeight.split(", ").every(e => availableWeights.includes(e))
      : true;
  }
  $: floatVariables = variables && variables.length > 0 ? variables.filter(v => v.resolvedType === "FLOAT") : [];
  $: stringVariables = variables && variables.length > 0 ? variables.filter(v => v.resolvedType === "STRING") : [];
  
  // Format variables for AutoComplete display
  $: floatVariableOptions = floatVariables.map(v => ({
    ...v,
    displayName: v.collectionName ? `${v.collectionName} / ${v.name}` : v.name
  }));
  $: stringVariableOptions = stringVariables.map(v => ({
    ...v,
    displayName: v.collectionName ? `${v.collectionName} / ${v.name}` : v.name
  }));

  function showMissingWeightsDialog() {
    weightsDialogVisible = true;
    newFontWeights = fontWeight.split(", ").map(weight => {
      return {
        currentWeight: weight,
        newWeight: weight
      };
    });
  }

  function setFontWeightMappings() {
    weightsDialogVisible = false;
    fontWeight = [...new Set(newFontWeights.map(n => n.newWeight))].join(", ");
  }
  
  // Helper functions for variable selection
  function getVariableById(id) {
    return [...floatVariables, ...stringVariables].find(v => v.id === id);
  }
  
  function getSelectedVariable(field) {
    const id = variableBindings[field];
    return id ? getVariableById(id) : null;
  }

  function remove() {
    sendToUI({
      type: "remove",
      values: {
        selectedStyles
      }
    });
  }
  
  function resetFields() {
    // Reset to original values from selected styles
    familyName = getFamilyNames(selectedStyles);
    fontWeight = getFontWeights(selectedStyles);
    fontSize = getFontSizes(selectedStyles);
    lineHeight = getLineHeights(selectedStyles);
    letterSpacing = getLetterSpacings(selectedStyles);
    
    // Reset variable bindings
    variableBindings = {};
    useVariableForSize = false;
    useVariableForLineHeight = false;
    useVariableForLetterSpacing = false;
    useVariableForWeight = false;
    useVariableForFamily = false;
    
    // Reset style name modifications
    styleName = "";
    styleMatch = "";
    description = selectedStyles.length ? selectedStyles[0].description : "";
  }

  function update() {
    let originalFamilyNames = getFamilyNames(selectedStyles);
    let originalFontWeights = getFontWeights(selectedStyles);
    let originalFontSizes = getFontSizes(selectedStyles);
    let originalLineHeights = getLineHeights(selectedStyles);
    let originalLetterSpacings = getLetterSpacings(selectedStyles);
    let values = {};
    values.selectedStyles = selectedStyles;
    values.styleMatch = styleMatch;
    values.styleName = styleName;
    values.description = description;

    // Handle variable bindings - include all existing bindings
    let bindings = {};
    
    // For each property, preserve existing binding if toggle is on
    // This ensures we don't lose bindings when updating other properties
    selectedStyles.forEach(style => {
      if (style.boundVariableIds) {
        // Preserve existing bindings that aren't being explicitly changed
        if (useVariableForSize) {
          bindings.fontSize = variableBindings.fontSize || style.boundVariableIds.fontSize;
        }
        if (useVariableForLineHeight) {
          bindings.lineHeight = variableBindings.lineHeight || style.boundVariableIds.lineHeight;
        }
        if (useVariableForLetterSpacing) {
          bindings.letterSpacing = variableBindings.letterSpacing || style.boundVariableIds.letterSpacing;
        }
        if (useVariableForWeight) {
          bindings.fontWeight = variableBindings.fontWeight || style.boundVariableIds.fontWeight;
        }
        if (useVariableForFamily) {
          bindings.fontFamily = variableBindings.fontFamily || style.boundVariableIds.fontFamily;
        }
      }
    });
    
    // Override with new selections
    if (useVariableForSize && variableBindings.fontSize) {
      bindings.fontSize = variableBindings.fontSize;
    }
    if (useVariableForLineHeight && variableBindings.lineHeight) {
      bindings.lineHeight = variableBindings.lineHeight;
    }
    if (useVariableForLetterSpacing && variableBindings.letterSpacing) {
      bindings.letterSpacing = variableBindings.letterSpacing;
    }
    if (useVariableForWeight && variableBindings.fontWeight) {
      bindings.fontWeight = variableBindings.fontWeight;
    }
    if (useVariableForFamily && variableBindings.fontFamily) {
      bindings.fontFamily = variableBindings.fontFamily;
    }
    
    // Include preserve existing bindings flag
    values.preserveExistingBindings = true;
    
    if (Object.keys(bindings).length > 0) {
      values.variableBindings = bindings;
    }

    if (!useVariableForFamily && originalFamilyNames !== familyName) {
      values.familyName = familyName;
    }
    if (!useVariableForWeight && originalFontWeights !== fontWeight) {
      if (fontWeight.split(", ").length > 1) {
        values.fontMappings = newFontWeights;
      }
      values.fontWeight = fontWeight;
    }
    if (!useVariableForSize && originalFontSizes !== fontSize) {
      values.fontSize = fontSize;
    }
    if (!useVariableForLineHeight && originalLineHeights !== lineHeight) {
      values.lineHeight = lineHeight;
    }
    if (!useVariableForLetterSpacing && originalLetterSpacings !== letterSpacing) {
      values.letterSpacing = letterSpacing;
    }

    sendToUI({
      type: "update",
      values,
      variant: "TEXT"
    });
  }

  function getFamilyNames(selectedStyles) {
    if (!selectedStyles || selectedStyles.length === 0) return "";
    return [...new Set(selectedStyles.map(n => n.fontName.family))].join(", ");
  }

  function getFontWeights(selectedStyles) {
    if (!selectedStyles || selectedStyles.length === 0) return "";
    return [...new Set(selectedStyles.map(n => n.fontName.style))].join(", ");
  }

  function getFontSizes(selectedStyles) {
    if (!selectedStyles || selectedStyles.length === 0) return "";
    return [...new Set(selectedStyles.map(n => n.fontSize))].join(", ");
  }

  function getLineHeights(selectedStyles) {
    if (!selectedStyles || selectedStyles.length === 0) return "";
    return [...new Set(selectedStyles.map(n => n.lineHeight))].join(", ");
  }

  function getLetterSpacings(selectedStyles) {
    if (!selectedStyles || selectedStyles.length === 0) return "";
    return [...new Set(selectedStyles.map(n => n.letterSpacing))].join(", ");
  }

  function setSelectedStyles(selected) {
    selectedStyles = selected || [];
    familyName = getFamilyNames(selected);
    fontWeight = getFontWeights(selected);
    fontSize = getFontSizes(selected);
    lineHeight = getLineHeights(selected);
    letterSpacing = getLetterSpacings(selected);
    description = selected && selected.length > 0 ? selected[0].description : "";
    
    // Initialize variable bindings from existing styles
    variableBindings = {};
    useVariableForSize = false;
    useVariableForLineHeight = false;
    useVariableForLetterSpacing = false;
    useVariableForWeight = false;
    useVariableForFamily = false;
    
    // If all selected styles have the same variable binding, show it
    if (selected && selected.length > 0) {
      const firstStyle = selected[0];
      if (firstStyle.boundVariableIds) {
        // Check if all selected styles have the same variable bindings
        const allHaveSameFontSizeVar = selected.every(s => 
          s.boundVariableIds && s.boundVariableIds.fontSize === firstStyle.boundVariableIds.fontSize
        );
        const allHaveSameLineHeightVar = selected.every(s => 
          s.boundVariableIds && s.boundVariableIds.lineHeight === firstStyle.boundVariableIds.lineHeight
        );
        const allHaveSameLetterSpacingVar = selected.every(s => 
          s.boundVariableIds && s.boundVariableIds.letterSpacing === firstStyle.boundVariableIds.letterSpacing
        );
        const allHaveSameFontWeightVar = selected.every(s => 
          s.boundVariableIds && s.boundVariableIds.fontWeight === firstStyle.boundVariableIds.fontWeight
        );
        const allHaveSameFontFamilyVar = selected.every(s => 
          s.boundVariableIds && s.boundVariableIds.fontFamily === firstStyle.boundVariableIds.fontFamily
        );
        
        // Set the UI to show existing bindings
        if (allHaveSameFontSizeVar && firstStyle.boundVariableIds.fontSize) {
          useVariableForSize = true;
          variableBindings.fontSize = firstStyle.boundVariableIds.fontSize;
        }
        if (allHaveSameLineHeightVar && firstStyle.boundVariableIds.lineHeight) {
          useVariableForLineHeight = true;
          variableBindings.lineHeight = firstStyle.boundVariableIds.lineHeight;
        }
        if (allHaveSameLetterSpacingVar && firstStyle.boundVariableIds.letterSpacing) {
          useVariableForLetterSpacing = true;
          variableBindings.letterSpacing = firstStyle.boundVariableIds.letterSpacing;
        }
        if (allHaveSameFontWeightVar && firstStyle.boundVariableIds.fontWeight) {
          useVariableForWeight = true;
          variableBindings.fontWeight = firstStyle.boundVariableIds.fontWeight;
        }
        if (allHaveSameFontFamilyVar && firstStyle.boundVariableIds.fontFamily) {
          useVariableForFamily = true;
          variableBindings.fontFamily = firstStyle.boundVariableIds.fontFamily;
        }
      }
    }
    
    // Reset style name modifications
    styleName = "";
    styleMatch = "";
  }
</script>

<style lang="scss">
  /* Add additional global or scoped styles here */

  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
  }

  .justify-between {
    justify-content: space-between;
  }

  hr {
    border: 0;
    height: 1px;
    background: var(--silver);
  }

  :global(.autocomplete) {
    margin: 0 var(--size-xxsmall);
    position: relative;
    font-family: var(--font-stack) !important;
    font-size: var(--font-size-xsmall);
  }

  :global(.autocomplete-input) {
    height: auto !important;
    border: 1px solid var(--silver);
    border-radius: 2px;
    padding: var(--size-xxsmall) !important;
  }

  :global(.autocomplete-input:focus) {
    outline: none;
    border: 1px solid var(--grey);
  }

  :global(.autocomplete-list) {
    position: absolute !important;
    top: 100% !important;
    margin-top: -1px;
    padding: 0 !important;
    border: 1px solid var(--silver) !important;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    max-height: calc(5 * (1rem + 10px) + 15px) !important;
  }

  :global(.autocomplete-list-item) {
    padding: var(--size-xxsmall) var(--size-xxsmall) !important;
  }

  :global(.autocomplete-list-item:hover) {
    background-color: var(--hover-fill) !important;
    border: 0;
    color: inherit !important;
  }

  :global(.autocomplete-list-item.selected) {
    background-color: var(--blue) !important;
    border: 0;
  }

  :global(.autocomplete-list-item.selected:hover) {
    color: white !important;
  }

  :global(.autocomplete-list::-webkit-scrollbar) {
    width: 9px;
  }

  :global(.autocomplete-list::-webkit-scrollbar-thumb) {
    background-color: var(--black3);
    border-radius: 9px;
    border: 2px solid white;
  }

  .autocomplete-wrapper {
    position: relative;
  }

  :global(input:disabled) {
    background-color: white;
  }

  .missing-button {
    position: absolute;
    right: 0;
    top: 0;
  }

  .flex-grow {
    flex-grow: 1;
  }
  
  .gap-xsmall {
    gap: var(--size-xsmall);
  }
  
  :global(.mixed-value) {
    color: var(--black8);
    font-style: italic;
  }
  
  .selected-styles-list {
    background: var(--hover-fill);
    padding: var(--size-xxsmall);
    border-radius: 2px;
    max-height: 80px;
    overflow-y: auto;
  }
  
  :global(.selected-style-item) {
    color: var(--black);
    line-height: 1.4;
  }
  
  .mt-xxxsmall {
    margin-top: var(--size-xxxsmall);
  }
</style>

<div>
  {#if weightsDialogVisible}
    <MissingWeightsDialog
      {newFontWeights}
      {availableWeights}
      {setFontWeightMappings} />
  {/if}

  <div class="styles-wrapper">
    <Selector type="Text" {styles} {setSelectedStyles} {sendToUI} bind:selectedStyles />
  </div>

  <hr class="mt-xxsmall" />
  
  {#if selectedStyles.length > 0}
    <div class="ml-xxsmall mr-xxsmall mb-xsmall">
      <Type size="xsmall" weight="medium">
        Editing {selectedStyles.length} style{selectedStyles.length > 1 ? 's' : ''}:
      </Type>
      <div class="selected-styles-list mt-xxxsmall">
        {#each (selectedStyles || []).slice(0, 3) as style}
          <Type size="xsmall" class="selected-style-item">• {style.name}</Type>
        {/each}
        {#if selectedStyles.length > 3}
          <Type size="xsmall" class="selected-style-item">• and {selectedStyles.length - 3} more...</Type>
        {/if}
      </div>
    </div>
  {/if}
  
  {#if selectedStyles.length > 1 && (hasMixedFontSizes || hasMixedLineHeights || hasMixedLetterSpacing || hasMixedFontWeights || hasMixedFontFamilies)}
    <div class="ml-xxsmall mr-xxsmall mb-xsmall">
      <Type size="xsmall" class="mixed-value">
        Note: Selected styles have mixed values. Changes will apply to all selected styles.
      </Type>
    </div>
  {/if}
  
  <form on:submit={e => e.preventDefault()}>

    <fieldset {disabled}>
      <Label>Family {hasMixedFontFamilies ? "(mixed)" : ""}</Label>
      <div class="flex flex-row align-center">
        <AutoComplete
          placeholder="Font family"
          items={availableFontNames}
          bind:selectedItem={familyName}
          disabled={useVariableForFamily}
          class="flex-grow" />
        <Switch
          bind:value={useVariableForFamily}
          class="mr-xxsmall"
        />
      </div>
      {#if useVariableForFamily}
        <AutoComplete
          placeholder="Select variable"
          items={stringVariableOptions}
          labelFieldName="displayName"
          valueFunction={(item) => item ? item.id : ''}
          labelFunction={(item) => item ? item.displayName : ''}
          onChange={(item) => variableBindings.fontFamily = item ? item.id : ''}
          selectedItem={getSelectedVariable('fontFamily')}
          class="ml-xxsmall mr-xxsmall mt-xsmall"
        />
      {/if}

      <Label>Weight {hasMixedFontWeights ? "(mixed)" : ""}</Label>
      <div class="autocomplete-wrapper">
        <div class="flex flex-row align-center">
          <AutoComplete
            placeholder="Font weight"
            items={availableWeights}
            bind:selectedItem={fontWeight}
            disabled={useVariableForWeight}
            class="flex-grow" />
          <Switch
            bind:value={useVariableForWeight}
            class="mr-xxsmall"
          />
        </div>
        {#if !hasAllWeightsAvailable && familyName.split(', ').length === 1 && !useVariableForWeight}
          <div class="missing-button pr-xxsmall">
            <IconButton
              iconName={IconWarning}
              on:click={showMissingWeightsDialog} />
          </div>
        {/if}
      </div>
      {#if useVariableForWeight}
        <AutoComplete
          placeholder="Select variable"
          items={stringVariableOptions}
          labelFieldName="displayName"
          valueFunction={(item) => item ? item.id : ''}
          labelFunction={(item) => item ? item.displayName : ''}
          onChange={(item) => variableBindings.fontWeight = item ? item.id : ''}
          selectedItem={getSelectedVariable('fontWeight')}
          class="ml-xxsmall mr-xxsmall mt-xsmall"
        />
      {/if}
      <div class="flex justify-content-between">
        <div class="flex-grow">
          <Label>Size {hasMixedFontSizes ? "(mixed)" : ""}</Label>
          <div class="flex flex-row align-center">
            <Input
              placeholder="Font Size"
              class="ml-xxsmall mr-xxsmall flex-grow"
              name="size"
              bind:value={fontSize}
              disabled={useVariableForSize} />
            <Switch
              bind:value={useVariableForSize}
              class="mr-xxsmall"
            />
          </div>
          {#if useVariableForSize}
            <AutoComplete
              placeholder="Select variable"
              items={floatVariableOptions}
              labelFieldName="displayName"
              valueFunction={(item) => item ? item.id : ''}
              labelFunction={(item) => item ? item.displayName : ''}
              onChange={(item) => variableBindings.fontSize = item ? item.id : ''}
              selectedItem={getSelectedVariable('fontSize')}
              class="ml-xxsmall mr-xxsmall mt-xsmall"
            />
          {/if}
        </div>
        <div class="flex-grow">
          <Label>Line height {hasMixedLineHeights ? "(mixed)" : ""}</Label>
          <div class="flex flex-row align-center">
            <Input
              placeholder="Line height"
              class="ml-xxsmall mr-xxsmall flex-grow"
              name="lineheight"
              bind:value={lineHeight}
              disabled={useVariableForLineHeight} />
            <Switch
              bind:value={useVariableForLineHeight}
              class="mr-xxsmall"
            />
          </div>
          {#if useVariableForLineHeight}
            <AutoComplete
              placeholder="Select variable"
              items={floatVariableOptions}
              labelFieldName="displayName"
              valueFunction={(item) => item ? item.id : ''}
              labelFunction={(item) => item ? item.displayName : ''}
              onChange={(item) => variableBindings.lineHeight = item ? item.id : ''}
              selectedItem={getSelectedVariable('lineHeight')}
              class="ml-xxsmall mr-xxsmall mt-xsmall"
            />
          {/if}
        </div>
        <div class="flex-grow">
          <Label>Letter Spacing {hasMixedLetterSpacing ? "(mixed)" : ""}</Label>
          <div class="flex flex-row align-center">
            <Input
              placeholder="% or px"
              class="ml-xxsmall mr-xxsmall flex-grow"
              name="letterspacing"
              bind:value={letterSpacing}
              disabled={useVariableForLetterSpacing} />
            <Switch
              bind:value={useVariableForLetterSpacing}
              class="mr-xxsmall"
            />
          </div>
          {#if useVariableForLetterSpacing}
            <AutoComplete
              placeholder="Select variable"
              items={floatVariableOptions}
              labelFieldName="displayName"
              valueFunction={(item) => item ? item.id : ''}
              labelFunction={(item) => item ? item.displayName : ''}
              onChange={(item) => variableBindings.letterSpacing = item ? item.id : ''}
              selectedItem={getSelectedVariable('letterSpacing')}
              class="ml-xxsmall mr-xxsmall mt-xsmall"
            />
          {/if}
        </div>
      </div>

      <Label>Name</Label>
      <div class="flex flex-row flex-between space-x-2">
        <Input
          placeholder="Find"
          class="ml-xxsmall mr-xxsmall flex-grow"
          name="match"
          bind:value={styleMatch} />
        <Input
          placeholder="Replace"
          class="ml-xxsmall mr-xxsmall flex-grow"
          name="name"
          bind:value={styleName} />
      </div>

      <Label>Description</Label>
      <Input
        placeholder="Description"
        class="ml-xxsmall mr-xxsmall"
        name="description"
        bind:value={description}
      />
      <div class="mt-xsmall flex ml-xxsmall mr-xxsmall flex justify-between">
        <Button {disabled} on:click={update}>Update styles</Button>
        <div class="flex gap-xsmall">
          <Button variant="secondary" {disabled} on:click={resetFields}>
            Reset
          </Button>
          <Button variant="secondary" {disabled} on:click={remove}>
            Delete
          </Button>
        </div>
      </div>
    </fieldset>
  </form>
</div>
