import * as vscode from 'vscode';

type ColorAction = string | ((match: string) => string);
type RuleTuple = ["fg" | "bg" | "reset", ColorAction, boolean?];

export function activate(context: vscode.ExtensionContext) {
    
	const tc = {
    			"dracula":          ["#21222C", "#FF5555", "#50FA7B", "#F1FA8C", "#BD93F9", "#FF79C6", "#8BE9FD", "#F8F8F2"],
    			"nord":             ["#3b4252", "#bf616a", "#a3be8c", "#ebcb8b", "#81a1c1", "#b48ead", "#88c0d0", "#e5e9f0"],
				"gruvbox":          ["#282828", "#cc241d", "#98971a", "#d79921", "#458588", "#b16286", "#689d6a", "#a89984"],
				"catppuccin-mocha": ["#45475a", "#f38ba8", "#a6e3a1", "#f9e2af", "#89b4fa", "#f5c2e7", "#94e2d5", "#bac2de"],
				"none":             ["#000000", "#cc0000", "#00cc00", "#cccc00", "#0000cc", "#cc00cc", "#00cccc"]}
	const themeKind = vscode.window.activeColorTheme.kind;
    const isLight = themeKind === vscode.ColorThemeKind.Light || 
    		        themeKind === vscode.ColorThemeKind.HighContrastLight; 
	const defaultTextColor = isLight ? "#333333" : "#cccccc";
	function getColors(a: Record<string, string[]>): string[] {
		const themePresets: Record<string, string[]> = a;
		const config = vscode.workspace.getConfiguration('stringPreview');
		const selectedPreset = config.get<string>('themePreset') || 'dracula';
		const customColors = config.get<string[]>('ansiColors');
		let colors: string[];
		if (selectedPreset !== 'custom' && themePresets[selectedPreset]) {
			colors = themePresets[selectedPreset];
		} else {
			colors = (customColors && customColors.length === 8) ? customColors : themePresets['dracula'];
		}
		return colors
	}

    const signatureProvider = vscode.languages.registerSignatureHelpProvider('*', {
        
        provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position) {
            const lineText = document.lineAt(position).text;
            const regex = /(f|r)?"([^"]*)"?/g;
            let match;
            let inString = false;
            let stringContent = "";

            while ((match = regex.exec(lineText)) !== null) {
                if (position.character > match.index + (match[1] ? match[1].length : 0) && position.character <= regex.lastIndex) {
                    inString = true;
                    stringContent = match[2] || "";
                    break;
                }
            }

            if (!inString) return undefined; 

            let colors = getColors(tc);

            const colorDict: Record<string, RuleTuple> = {
                "\\\\033\\[3[0-9]m": ["fg", (m: string) => {
                    const index = parseInt(m.slice(-2, -1));
                    return colors[index] || defaultTextColor;}, true],
                "\\\\033\\[4[0-9]m": ["bg", (m: string) => {
                    const index = parseInt(m.slice(-2, -1));
                    return colors[index] || "transparent";}, true],
                "\\\\033\\[0m": ["reset", "", true]
            };

            const patternParts = Object.entries(colorDict).map(([key, rule]) => {
                return rule[2] ? `(${key})` : key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            });
            
            const colorRegex = new RegExp(patternParts.join('|'));
            const tokens = stringContent.split(colorRegex);

            let currentColor = defaultTextColor; 
            let currentBGColor = "transparent";
            
            let currentX = 8;
            
            let bgRects = "";
            let textTspans = "";
            let cleanCharacterCount = 0; 

            for (const token of tokens) {
                if (!token) continue; 
                let matchedRule = false;

                for (const [key, rule] of Object.entries(colorDict)) {
                    const [target, valueOrLambda, isRegex] = rule;
                    const isMatch = isRegex ? new RegExp(`^${key}$`).test(token) : token === key;

                    if (isMatch) {
                        matchedRule = true;
                        
                        if (target === "reset") {
                            currentColor = defaultTextColor;
                            currentBGColor = "transparent";
                        } else {
                            const finalColor = typeof valueOrLambda === "function" 
                                ? valueOrLambda(token) 
                                : valueOrLambda;
                            
                            if (target === "fg") currentColor = finalColor;
                            if (target === "bg") currentBGColor = finalColor;
                        }
                        break;
                    }
                }

                // Render logic
                if (!matchedRule) {
                    const safeText = token.replace(/[<>&'"]/g, (c) => {
                        switch (c) {
                            case '<': return '&lt;';
                            case '>': return '&gt;';
                            case '&': return '&amp;';
                            case '\'': return '&apos;';
                            case '"': return '&quot;';
                            default: return c;
                        }
                    });

                    const chunkWidth = token.length * 8.4;                    
                    
                    if (currentBGColor !== "transparent") {
                        bgRects += `<rect x="${currentX}" y="2" width="${chunkWidth}" height="18" fill="${currentBGColor}" rx="2"/>`;
                    }                    
                    
                    textTspans += `<tspan fill="${currentColor}">${safeText}</tspan>`;
                    
                    currentX += chunkWidth;
                    cleanCharacterCount += token.length; 
                }
            }

            const estimatedWidth = Math.max(currentX + 8, 50);
            
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${estimatedWidth}" height="24">
                <!-- 1. Native VS Code background -->
                <rect width="100%" height="100%" fill="transparent" />
                
                <!-- 2. Dynamically colored background rectangles -->
                ${bgRects}
                
                <!-- 3. The actual text layer (xml:space preserve keeps space sizing accurate) -->
                <text x="8" y="16" font-family="monospace" font-size="14" xml:space="preserve">${textTspans}</text>
            </svg>`;

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
        }
    }, '"');

	const colorProvider = vscode.languages.registerColorProvider({ language: 'python' }, {
        provideDocumentColors(document: vscode.TextDocument): vscode.ColorInformation[] {
			const config = vscode.workspace.getConfiguration('stringPreview');
            const enableBoxes = config.get<boolean>('enableColorBoxes', true);
            if (!enableBoxes) {
                return [];
            }
            const colors: vscode.ColorInformation[] = [];
            const text = document.getText();
            
            const regex = /\\033\[3([0-9])m/g;
            let match;

            const hexPalette = getColors(tc);

            while ((match = regex.exec(text)) !== null) {
                const colorIndex = parseInt(match[1]);
                const hex = hexPalette[colorIndex] || "#cccccc";
                
                const r = parseInt(hex.slice(1, 3), 16) / 255;
                const g = parseInt(hex.slice(3, 5), 16) / 255;
                const b = parseInt(hex.slice(5, 7), 16) / 255;

                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                
                colors.push(new vscode.ColorInformation(
                    new vscode.Range(startPos, endPos),
                    new vscode.Color(r, g, b, 1)
                ));
            }
            return colors;
        },

        provideColorPresentations(color: vscode.Color, context: { document: vscode.TextDocument; range: vscode.Range }) {
            //new color
			return [];
        }
    });

    context.subscriptions.push(colorProvider);
    context.subscriptions.push(signatureProvider);
}

export function deactivate() {}