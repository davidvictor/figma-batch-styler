<script>
    import { GlobalCSS } from "figma-plugin-ds-svelte";
    import { onMount } from "svelte";
    import TextStyles from "./TextStyles.svelte";
    import ColorStyles from "./ColorStyles.svelte";
    import NoneFound from "./NoneFound.svelte";
    import Loading from "./Loading.svelte";
    import MissingWeightsDialog from "./MissingWeightsDialog.svelte";
    import Github from "./github.svg";

    import {
        Button,
        Icon,
        IconButton,
        Label,
        Type,
        Section,
        SelectMenu,
        Switch,
        IconWarning,
    } from "figma-plugin-ds-svelte";

    let textStyles = [];
    let colorStyles = [];
    let availableFamilies = [];
    let variables = [];
    let loading = true;
    let visible = "text";

    onMount(() => {
        setTimeout(() => {
            sendToUI({
                type: "refresh",
            });
        }, 1000);
    });

    function sendToUI({ type, variant, values = {} }) {
        parent.postMessage(
            {
                pluginMessage: {
                    type,
                    variant,
                    ...values,
                },
            },
            "*",
        );
    }

    function cancel() {
        sendToUI({
            type: "cancel",
        });
    }

    function setVisible(e) {
        visible = e.target.name;
    }

    onmessage = (event) => {
        if (event.data.pluginMessage.type === "postStyles") {
            textStyles = event.data.pluginMessage.textStyles;
            colorStyles = event.data.pluginMessage.colorStyles;
            availableFamilies = event.data.pluginMessage.availableFonts;
            variables = event.data.pluginMessage.variables || [];
            if (!textStyles.length && colorStyles.length) {
                visible = "color";
            }
            loading = false;
        }
    };
</script>

<div class="outer-wrapper">
    <div class="flex justify-content-between">
        <button
            class="tab-button {visible === 'text' ? 'tab-button-active' : ''}"
            name="text"
            on:click={setVisible}
        >
            Text
        </button>
        <button
            class="tab-button {visible === 'color' ? 'tab-button-active' : ''}"
            name="color"
            on:click={setVisible}
        >
            Color
        </button>
    </div>
    <div class="p-xxsmall inner-wrapper">
        {#if loading}
            <Loading />
        {:else}
            {#if textStyles.length || colorStyles.length}
                {#if visible === "text"}
                    {#if textStyles.length}
                        <TextStyles
                            {sendToUI}
                            styles={textStyles}
                            {availableFamilies}
                            {variables}
                        />
                    {:else}
                        <NoneFound>No Text Styles found</NoneFound>
                    {/if}
                {/if}
                {#if visible === "color"}
                    {#if colorStyles.length}
                        <ColorStyles
                            {sendToUI}
                            styles={colorStyles}
                            {variables}
                        />
                    {:else}
                        <NoneFound>No Color Styles found</NoneFound>
                    {/if}
                {/if}
            {:else}
                <NoneFound>No Styles found</NoneFound>
            {/if}
            <div
                class="ml-xxsmall mr-xxsmall flex justify-content-between
        align-items-center"
            >
                <Type>
                    More information at
                    <a
                        href="https://mdrn.love"
                        style="text-decoration: underline;"
                        target="_blank"
                    >
                        mdrn.love
                    </a>
                </Type>
                <a
                    class="gh-link"
                    href="https://github.com/davidvictor/figma-batch-styler"
                    target="_blank"
                >
                    <IconButton iconName={Github} />
                </a>
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    .tab-button {
        background: var(--selection-a);
        border-bottom: 1px solid var(--selection-b);
        padding: var(--size-xsmall);
        font-family: var(--font-stack);
        font-weight: var(--font-weight-bold);
        font-size: var(--font-size-small);
        flex-grow: 1;
        outline: none;
        border: none;
        cursor: pointer;
        transition: background 300ms;
    }

    .tab-button:hover {
        background: var(--selection-b);
    }

    .tab-button-active {
        background: var(--blue);
        color: white;
    }

    .tab-button-active:hover {
        background: var(--blue);
        color: white;
    }

    .outer-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .gh-link {
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    .inner-wrapper {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        justify-content: space-between;
    }

    :global(body::-webkit-scrollbar) {
        width: 9px;
    }

    :global(body::-webkit-scrollbar-thumb) {
        background-color: var(--black3);
        border-radius: 9px;
        border: 2px solid white;
    }
</style>
