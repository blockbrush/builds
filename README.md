# Blockbrush builds

A library of Minecraft builds you can open, walk through and download in
[Blockbrush](https://blockbrush.app). Each build is a folder with its file, a short
description and a preview picture. Blockbrush reads `index.json` to list them.

## Layout

```
builds/
  creeper-cobble/          one folder per build, named in lower case with dashes
    build.litematic        the build (.litematic, .schem, .nbt or .mcstructure)
    info.json              name, author, tags… (see below)
    preview.png            a picture of the build, made in Blockbrush with no texture pack
    build.blockbrush       optional: the editable Blockbrush file (layers, houses, shapes)
  _template/               copy this to start a new build
index.json                 made by scripts/build-index.js, never edited by hand
```

## info.json

```json
{
  "name": "Creeper cobblestone farm",
  "author": "kuues",
  "description": "A compact cobblestone farm run by creepers.",
  "tags": ["farm", "cobblestone", "redstone"],
  "minecraft": "1.21.4",
  "file": "build.litematic",
  "preview": "preview.png",
  "added": "2026-11-05"
}
```

- `name`, `author`, `tags`, `minecraft`, `file` are required.
- `project` is optional: `"build.blockbrush"` when the folder has the editable file. Browse then opens that,
  and offers the schematic too.
- Tags are lower case, words joined with dashes (`mob-farm`). Use existing tags where one fits.
- Later the check will open each build in Blockbrush and add its size and block count to the index.

## Adding a build

The easy way: in Blockbrush, Builds › **Share to the library** (or the Download menu) fills this in, takes the
picture and downloads the folder. Unzip it, open this repo's `builds` folder, **Add file › Upload files**, drag the
folder in and propose the change.

By hand:

1. Copy `builds/_template` to `builds/<your-build>` and fill in `info.json`.
2. Add your build file and a `preview.png`.
3. Open a pull request. A check reads every `info.json`; once merged, the index updates on its own.

By opening a pull request you agree to share the build under the licence below.

## Licence

Builds are shared under [CC BY 4.0](LICENSE.md): anyone may use and change them, crediting the author.
Don't submit builds that aren't yours to share.
