# text- README

a vs code extension for people writing in python and want to quickly see how ansi escape codes will affect their text.
https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797 

## how to install

1. download the .vsix from the releases area.
2. VS code -> extensions -> ... (top right of sidebar) -> install from vsix -> select the .vsix file and click install, wait for the notification of it being enabled and try it out.
2. or after step 1 in terminal in same directory as the downloaded .vsix file run `code --install-extension ansi-string-preview-0.1.0.vsix`
3. wait for the notification saying `[string preview] activated`
4. to test tpye `"colors: \033[31m red \033[32m green \033[33m yellow \033[34m blue \033[35m pink \033[36m teal"`
5. if the preview doesnt appeer make sure your typing cursor (the blinking line one) is in the string then press ctrl+shift+space.
6. if in python you can try printing the string to show that the colors do match up.
7. or you can just watch the YT video and skip this to just see it in action.

## Features

shows a preview of what your stylized code will look like with escape codes applied

allows for quick chaning of the color of the escape code.

in the extension menu in the sidebar, you can press the settings icon for the ANSI string preview extension and you can change the colors to whatever theme your terminal uses.

## example

if video dosent pop up watch the .mp4 in the repo. 
<video controls src="Screen Recording 2026-07-20 124803.mp4" title="Title"></video>

## Requirements

vscode

## Extension Settings

its just default color themes if you have a customized terminal.

## Known Issues

none, so far...
if your preview disappears you can press shift + ctrl + space to make the preview reaper


## notes

made for hackclubs stardance.
