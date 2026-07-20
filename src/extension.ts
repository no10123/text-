import * as vscode from 'vscode';

type ColorAction = string | ((match: string) => string);
type RuleTuple = ["fg" | "bg" | "reset", ColorAction, boolean?];

export function activate(context: vscode.ExtensionContext) {
    
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

            const themeKind = vscode.window.activeColorTheme.kind;
            const isLight = themeKind === vscode.ColorThemeKind.Light || 
                            themeKind === vscode.ColorThemeKind.HighContrastLight;
            const defaultTextColor = isLight ? "#333333" : "#cccccc"; 

			const config = vscode.workspace.getConfiguration('stringPreview');
			const userColors = config.get<string[]>('ansiColors');
			const fallbackColors = ["#000000", "#cd0000", "#00cd00", "#cdcd00", "#0000ee", "#cd00cd", "#00cdcd", "#e5e5e5"];

			const colors = (userColors && userColors.length === 8) ? userColors : fallbackColors;

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
            
            let currentX = 8; // Starting X offset for the background rectangles
            
            let bgRects = ""; // Holds only the background boxes
            let textTspans = ""; // Holds the perfectly flowing text
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

    context.subscriptions.push(signatureProvider);
}

export function deactivate() {}