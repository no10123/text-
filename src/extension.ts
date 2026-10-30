import * as vscode from 'vscode';

interface AnsiState {
    fg: string;
    bg: string;
    bold: boolean;
    dim: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
}

function clamp255(v: number): number {
    if (Number.isNaN(v)) return 0;
    return Math.max(0, Math.min(255, v));
}

function rgbToHex(r: number, g: number, b: number): string {
    r = clamp255(r); g = clamp255(g); b = clamp255(b);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function hexToRgb(hex: string): { r: number, g: number, b: number } {
    const clean = hex.replace('#', '');
    return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16)
    };
}

function escapeHtml(unsafe: string): string {
    const htmlMap: Record<string, string> = {
        '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
    };
    return unsafe.replace(/[<>&'"]/g, (c) => htmlMap[c] || c);
}

function brighten(hex: string, amount = 45): string {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(r + amount, g + amount, b + amount);
}

function withBrights(base8: string[], amount = 45): string[] {
    return [...base8, ...base8.map(c => brighten(c, amount))];
}

const c256: string[] = [
    "#000000", "#800000", "#008000", "#808000", "#000080", "#800080", "#008080", "#c0c0c0",
    "#808080", "#ff0000", "#00ff00", "#ffff00", "#0000ff", "#ff00ff", "#00ffff", "#ffffff",
    "#000000", "#00005f", "#000087", "#0000af", "#0000d7", "#0000ff", "#005f00", "#005f5f",
    "#005f87", "#005faf", "#005fd7", "#005fff", "#008700", "#00875f", "#008787", "#0087af",
    "#0087d7", "#0087ff", "#00af00", "#00af5f", "#00af87", "#00afaf", "#00afd7", "#00afff",
    "#00d700", "#00d75f", "#00d787", "#00d7af", "#00d7d7", "#00d7ff", "#00ff00", "#00ff5f",
    "#00ff87", "#00ffaf", "#00ffd7", "#00ffff", "#5f0000", "#5f005f", "#5f0087", "#5f00af",
    "#5f00d7", "#5f00ff", "#5f5f00", "#5f5f5f", "#5f5f87", "#5f5faf", "#5f5fd7", "#5f5fff",
    "#5f8700", "#5f875f", "#5f8787", "#5f87af", "#5f87d7", "#5f87ff", "#5faf00", "#5faf5f",
    "#5faf87", "#5fafaf", "#5fafd7", "#5fafff", "#5fd700", "#5fd75f", "#5fd787", "#5fd7af",
    "#5fd7d7", "#5fd7ff", "#5fff00", "#5fff5f", "#5fff87", "#5fffaf", "#5fffd7", "#5fffff",
    "#870000", "#87005f", "#870087", "#8700af", "#8700d7", "#8700ff", "#875f00", "#875f5f",
    "#875f87", "#875faf", "#875fd7", "#875fff", "#878700", "#87875f", "#878787", "#8787af",
    "#8787d7", "#8787ff", "#87af00", "#87af5f", "#87af87", "#87afaf", "#87afd7", "#87afff",
    "#87d700", "#87d75f", "#87d787", "#87d7af", "#87d7d7", "#87d7ff", "#87ff00", "#87ff5f",
    "#87ff87", "#87ffaf", "#87ffd7", "#87ffff", "#af0000", "#af005f", "#af0087", "#af00af",
    "#af00d7", "#af00ff", "#af5f00", "#af5f5f", "#af5f87", "#af5faf", "#af5fd7", "#af5fff",
    "#af8700", "#af875f", "#af8787", "#af87af", "#af87d7", "#af87ff", "#afaf00", "#afaf5f",
    "#afaf87", "#afafaf", "#afafd7", "#afafff", "#afd700", "#afd75f", "#afd787", "#afd7af",
    "#afd7d7", "#afd7ff", "#afff00", "#afff5f", "#afff87", "#afffaf", "#afffd7", "#afffff",
    "#d70000", "#d7005f", "#d70087", "#d700af", "#d700d7", "#d700ff", "#d75f00", "#d75f5f",
    "#d75f87", "#d75faf", "#d75fd7", "#d75fff", "#d78700", "#d7875f", "#d78787", "#d787af",
    "#d787d7", "#d787ff", "#d7af00", "#d7af5f", "#d7af87", "#d7afaf", "#d7afd7", "#d7afff",
    "#d7d700", "#d7d75f", "#d7d787", "#d7d7af", "#d7d7d7", "#d7d7ff", "#d7ff00", "#d7ff5f",
    "#d7ff87", "#d7ffaf", "#d7ffd7", "#d7ffff", "#ff0000", "#ff005f", "#ff0087", "#ff00af",
    "#ff00d7", "#ff00ff", "#ff5f00", "#ff5f5f", "#ff5f87", "#ff5faf", "#ff5fd7", "#ff5fff",
    "#ff8700", "#ff875f", "#ff8787", "#ff87af", "#ff87d7", "#ff87ff", "#ffaf00", "#ffaf5f",
    "#ffaf87", "#ffafaf", "#ffafd7", "#ffafff", "#ffd700", "#ffd75f", "#ffd787", "#ffd7af",
    "#ffd7d7", "#ffd7ff", "#ffff00", "#ffff5f", "#ffff87", "#ffffaf", "#ffffd7", "#ffffff",
    "#080808", "#121212", "#1c1c1c", "#262626", "#303030", "#3a3a3a", "#444444", "#4e4e4e",
    "#585858", "#626262", "#6c6c6c", "#767676", "#808080", "#8a8a8a", "#949494", "#9e9e9e",
    "#a8a8a8", "#b2b2b2", "#bcbcbc", "#c6c6c6", "#d0d0d0", "#dadada", "#e4e4e4", "#eeeeee"
];

const BASE_THEMES: Record<string, string[]> = {
    "dracula":          ["#505052", "#FF5555", "#50FA7B", "#F1FA8C", "#BD93F9", "#FF79C6", "#8BE9FD", "#F8F8F2"],
    "nord":             ["#3b4252", "#bf616a", "#a3be8c", "#ebcb8b", "#81a1c1", "#b48ead", "#88c0d0", "#e5e9f0"],
    "gruvbox":          ["#282828", "#cc241d", "#98971a", "#d79921", "#458588", "#b16286", "#689d6a", "#a89984"],
    "catppuccin-mocha": ["#45475a", "#f38ba8", "#a6e3a1", "#f9e2af", "#89b4fa", "#f5c2e7", "#94e2d5", "#bac2de"],
    // FIX: "none" was missing its 8th (white) entry
    "none":             ["#000000", "#cc0000", "#00cc00", "#cccc00", "#0000cc", "#cc00cc", "#00cccc", "#cccccc"]
};

const THEME_PRESETS: Record<string, string[]> = Object.fromEntries(
    Object.entries(BASE_THEMES).map(([name, base]) => [name, withBrights(base)])
);

const ESC = "\\\\033";
const SGR_SOURCE = `${ESC}\\[[0-9;]*m`;
const SGR_TOKEN_GLOBAL = new RegExp(`(${SGR_SOURCE})`, 'g');
const SGR_ANCHORED = new RegExp(`^${SGR_SOURCE}$`);

function defaultState(fg: string): AnsiState {
    return { fg, bg: 'transparent', bold: false, dim: false, italic: false, underline: false, strikethrough: false };
}

function applySgrSequence(state: AnsiState, token: string, basic: string[], colors256: string[], defaultFg: string, stylesEnabled: boolean) {
    const allNums = (token.match(/\d+/g) || []).map(Number);
    const params = allNums.slice(1);
    if (params.length === 0) params.push(0);

    for (let i = 0; i < params.length; i++) {
        const code = params[i];

        if (code === 38 || code === 48) {
            const mode = params[i + 1];
            if (mode === 5) {
                const index = params[i + 2];
                const color = colors256[index];
                if (code === 38) state.fg = color ?? defaultFg;
                else state.bg = color ?? 'transparent';
                i += 2;
            } else if (mode === 2) {
                const color = rgbToHex(params[i + 2] ?? 0, params[i + 3] ?? 0, params[i + 4] ?? 0);
                if (code === 38) state.fg = color; else state.bg = color;
                i += 4;
            }
            continue;
        }

        if (code === 0) { Object.assign(state, defaultState(defaultFg)); continue; }
        if (code === 39) { state.fg = defaultFg; continue; }
        if (code === 49) { state.bg = 'transparent'; continue; }

        if (code >= 30 && code <= 37) { state.fg = basic[code - 30] ?? defaultFg; continue; }
        if (code >= 90 && code <= 97) { state.fg = basic[(code - 90) + 8] ?? defaultFg; continue; }
        if (code >= 40 && code <= 47) { state.bg = basic[code - 40] ?? 'transparent'; continue; }
        if (code >= 100 && code <= 107) { state.bg = basic[(code - 100) + 8] ?? 'transparent'; continue; }

        if (!stylesEnabled) continue;
        if (code === 1) { state.bold = true; continue; }
        if (code === 2) { state.dim = true; continue; }
        if (code === 3) { state.italic = true; continue; }
        if (code === 4) { state.underline = true; continue; }
        if (code === 9) { state.strikethrough = true; continue; }
        if (code === 22) { state.bold = false; state.dim = false; continue; }
        if (code === 23) { state.italic = false; continue; }
        if (code === 24) { state.underline = false; continue; }
        if (code === 29) { state.strikethrough = false; continue; }
    }
}

function renderAnsiSvg(content: string, basic: string[], colors256: string[], defaultFg: string, stylesEnabled: boolean): string {
    const tokens = content.split(SGR_TOKEN_GLOBAL);
    let state = defaultState(defaultFg);
    let currentX = 8;
    let bgRects = "";
    let textTspans = "";

    for (const token of tokens) {
        if (!token) continue;

        if (SGR_ANCHORED.test(token)) {
            applySgrSequence(state, token, basic, colors256, defaultFg, stylesEnabled);
            continue;
        }

        const safeText = escapeHtml(token);
        const chunkWidth = token.length * 8.4;

        if (state.bg !== "transparent") {
            bgRects += `<rect x="${currentX}" y="2" width="${chunkWidth}" height="18" fill="${state.bg}" rx="2"/>`;
        }

        const styleAttrs: string[] = [];
        if (state.bold) styleAttrs.push(`font-weight="bold"`);
        if (state.italic) styleAttrs.push(`font-style="italic"`);
        const decorations = [state.underline && "underline", state.strikethrough && "line-through"].filter(Boolean);
        if (decorations.length) styleAttrs.push(`text-decoration="${decorations.join(' ')}"`);
        if (state.dim) styleAttrs.push(`fill-opacity="0.6"`);

        textTspans += `<tspan fill="${state.fg}" ${styleAttrs.join(' ')}>${safeText}</tspan>`;
        currentX += chunkWidth;
    }

    const estimatedWidth = Math.max(currentX + 8, 50);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${estimatedWidth}" height="24">
                <rect width="100%" height="100%" fill="transparent" />
                ${bgRects}
                <text x="8" y="16" font-family="monospace" font-size="14" xml:space="preserve">${textTspans}</text>
            </svg>`;
}

// ' or "" or ''' or """ 
function findStringAtPosition(lineText: string, position: vscode.Position): string | undefined {
    const regex = /(?:[bBfFrRuU]{1,2})?('''|"""|'|")((?:\\.|(?!\1)[^\\\r\n])*)(?:\1)?/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(lineText)) !== null) {
        const quote = match[1];
        const prefixLen = match[0].indexOf(quote);
        const start = match.index + prefixLen + quote.length;
        const end = start + match[2].length;
        if (position.character >= start && position.character <= end) {
            return match[2];
        }
        if (regex.lastIndex === match.index) regex.lastIndex++;
    }
    return undefined;
}

function getDefaultTextColor(): string {
    const kind = vscode.window.activeColorTheme.kind;
    const isLight = kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight;
    return isLight ? "#333333" : "#cccccc";
}

function getColors(): string[] {
    const config = vscode.workspace.getConfiguration('stringPreview');
    const selectedPreset = config.get<string>('themePreset') || 'dracula';
    const customColors = config.get<string[]>('ansiColors');
    const brightenAmount = config.get<number>('brightenAmount', 45);

    if (selectedPreset !== 'custom' && THEME_PRESETS[selectedPreset]) {
        return THEME_PRESETS[selectedPreset];
    }
    if (customColors && customColors.length === 16) return customColors;
    if (customColors && customColors.length === 8) return withBrights(customColors, brightenAmount);
    return THEME_PRESETS['dracula'];
}

function nearestIndex(rgb: { r: number, g: number, b: number }, palette: string[]): { index: number, distance: number } {
    let bestIndex = 0;
    let bestDist = Infinity;
    palette.forEach((hex, i) => {
        const p = hexToRgb(hex);
        const d = (p.r - rgb.r) ** 2 + (p.g - rgb.g) ** 2 + (p.b - rgb.b) ** 2;
        if (d < bestDist) { bestDist = d; bestIndex = i; }
    });
    return { index: bestIndex, distance: bestDist };
}

export function activate(context: vscode.ExtensionContext) {
    vscode.window.showInformationMessage('[stringPreview] extension activated!');
    console.log('[stringPreview] activate() called, build timestamp check OK');

    
    const signatureProvider = vscode.languages.registerSignatureHelpProvider('*', {
        provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position) {
            try {
                const lineText = document.lineAt(position).text;
                const stringContent = findStringAtPosition(lineText, position);
                console.log('[stringPreview] provideSignatureHelp fired. stringContent found:', stringContent !== undefined);
                if (stringContent === undefined) return undefined;

                const config = vscode.workspace.getConfiguration('stringPreview');
                const stylesEnabled = config.get<boolean>('enableTextStyles', true);
                const colors = getColors();
                const defaultFg = getDefaultTextColor();

                const svg = renderAnsiSvg(stringContent, colors, c256, defaultFg, stylesEnabled);
                const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

                const formattedMarkdown = new vscode.MarkdownString();
                formattedMarkdown.isTrusted = true;
                formattedMarkdown.appendMarkdown(`![preview](${dataUri})`);

                const signatureInfo = new vscode.SignatureInformation('String Preview', formattedMarkdown);
                const signatureHelp = new vscode.SignatureHelp();
                signatureHelp.signatures = [signatureInfo];
                signatureHelp.activeSignature = 0;
                signatureHelp.activeParameter = 0;

                return signatureHelp;
            } catch (err) {
                console.error('[stringPreview] provideSignatureHelp threw:', err);
                vscode.window.showErrorMessage('stringPreview signature help error: ' + (err as Error).message);
                return undefined;
            }
        }
    }, '"', "'");

    const colorProvider = vscode.languages.registerColorProvider({ language: 'python' }, {
        provideDocumentColors(document: vscode.TextDocument): vscode.ColorInformation[] {
            const config = vscode.workspace.getConfiguration('stringPreview');
            if (!config.get<boolean>('enableColorBoxes', true)) return [];

            const colorInfos: vscode.ColorInformation[] = [];
            const text = document.getText();
            const basic = getColors();

            const regex = new RegExp(`(${SGR_SOURCE})|#([0-9a-fA-F]{6})`, 'g');
            let match;

            while ((match = regex.exec(text)) !== null) {
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);

                if (match[2]) { // hex match
                    const rgb = hexToRgb(match[2]);
                    colorInfos.push(new vscode.ColorInformation(range, new vscode.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255, 1)));
                    continue;
                }

                const state = defaultState(getDefaultTextColor());
                const before = { ...state };
                applySgrSequence(state, match[1], basic, c256, before.fg, false);

                if (state.fg !== before.fg) {
                    const rgb = hexToRgb(state.fg);
                    colorInfos.push(new vscode.ColorInformation(range, new vscode.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255, 1)));
                }
                if (state.bg !== before.bg && state.bg !== 'transparent') {
                    const rgb = hexToRgb(state.bg);
                    colorInfos.push(new vscode.ColorInformation(range, new vscode.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255, 1)));
                }
            }
            return colorInfos;
        },

        provideColorPresentations(color: vscode.Color) {
            const r = Math.round(color.red * 255);
            const g = Math.round(color.green * 255);
            const b = Math.round(color.blue * 255);
            const hex = rgbToHex(r, g, b);
            const basic = getColors();

            const presentations = [
                new vscode.ColorPresentation(hex),
                new vscode.ColorPresentation(`\\033[38;2;${r};${g};${b}m`),
                new vscode.ColorPresentation(`\\033[48;2;${r};${g};${b}m`)
            ];

            const basicMatch = nearestIndex({ r, g, b }, basic);
            if (basicMatch.distance <= 4) {
                const code = basicMatch.index < 8 ? 30 + basicMatch.index : 90 + (basicMatch.index - 8);
                presentations.push(new vscode.ColorPresentation(`\\033[${code}m`));
                const bgCode = basicMatch.index < 8 ? 40 + basicMatch.index : 100 + (basicMatch.index - 8);
                presentations.push(new vscode.ColorPresentation(`\\033[${bgCode}m`));
            } else {
                const cubeMatch = nearestIndex({ r, g, b }, c256);
                if (cubeMatch.distance <= 4) {
                    presentations.push(new vscode.ColorPresentation(`\\033[38;5;${cubeMatch.index}m`));
                    presentations.push(new vscode.ColorPresentation(`\\033[48;5;${cubeMatch.index}m`));
                }
            }

            return presentations;
        }
    });

    const hoverProvider = vscode.languages.registerHoverProvider('python', {
        provideHover(document: vscode.TextDocument, position: vscode.Position) {
            try {
                const range = document.getWordRangeAtPosition(position);
                if (!range) return;

                const word = document.getText(range);
                const docstring = getDocstringForSymbol(word);
                if (!docstring || !/\x1b\[/.test(docstring)) return;

                const config = vscode.workspace.getConfiguration('stringPreview');
                const stylesEnabled = config.get<boolean>('enableTextStyles', true);
                const colors = getColors();
                const defaultFg = getDefaultTextColor();

                const svg = renderAnsiSvg(docstring, colors, c256, defaultFg, stylesEnabled);
                const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

                const content = new vscode.MarkdownString();
                content.isTrusted = true;
                content.supportHtml = true;
                content.appendMarkdown(ansiToMarkdown(docstring) + "\n\n");
                content.appendMarkdown(`![preview](${dataUri})`);

                return new vscode.Hover(content, range);
            } catch (err) {
                console.error('[stringPreview] provideHover threw:', err);
                return undefined;
            }
        }
    });

    context.subscriptions.push(hoverProvider);
    context.subscriptions.push(colorProvider);
    context.subscriptions.push(signatureProvider);
}

export function deactivate() {}

// --- Hover Utilities ---
function getDocstringForSymbol(symbol: string): string | undefined {
    return undefined;
}

function ansiToMarkdown(text: string): string {
    return text
        .replace(/\x1b\[1m(.*?)\x1b\[0?m/g, '**$1**')       // Bold
        .replace(/\x1b\[3m(.*?)\x1b\[0?m/g, '*$1*')         // Italic
        .replace(/\x1b\[4m(.*?)\x1b\[0?m/g, '<u>$1</u>')    // Underline (EXTENDED)
        .replace(/\x1b\[9m(.*?)\x1b\[0?m/g, '<s>$1</s>')    // Strikethrough (EXTENDED)
        .replace(/\x1b\[[0-9;]*m/g, '');                    // Strip remaining raw ANSI
}