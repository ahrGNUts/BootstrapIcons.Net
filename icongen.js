import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFile, open } from 'fs/promises';
import camelcase from 'camelcase';
import { JSDOM } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));

const enumCsPath = resolve(__dirname, 'BootstrapIcons.Shared/BootstrapIconGlyph.generated.cs');

const bootstrapIconDataPath = './node_modules/bootstrap-icons/font/bootstrap-icons.json';
const bootstrapIconData = JSON.parse(await readFile(bootstrapIconDataPath, { encoding: 'utf8' }));
const bootstrapIconSvg = './node_modules/bootstrap-icons/bootstrap-icons.svg';
const jsdomOpts = {};

const namespace = 'BootstrapIcons.Net';

const writeSummary = async function(handle, text, indentLevel) {
    const indent = '\t'.repeat(indentLevel);
    await handle.write(indent + '/// <summary>\r\n');
    await handle.write(indent + '/// ' + text + '\r\n');
    await handle.write(indent + '/// </summary>\r\n');
};

(async function() {
    let handle;
    try {
        handle = await open(enumCsPath, 'w');
        let allSvgIcons = await JSDOM.fromFile(bootstrapIconSvg, jsdomOpts);

        await handle.write('//------------------------------------------------------------------------------\r\n');
        await handle.write('// <auto-generated>\r\n');
        await handle.write('//     This code was generated by a tool\r\n');
        await handle.write('//\r\n');
        await handle.write('//     Changes to this file may cause incorrect behavior and will be lost if\r\n');
        await handle.write('//     the code is regenerated.\r\n');
        await handle.write('// </auto-generated>\r\n');
        await handle.write('//------------------------------------------------------------------------------\r\n\r\n');
        await handle.write('using ' + namespace + '.Attributes;\r\n\r\n');
        await handle.write('namespace ' + namespace + '\r\n');
        await handle.write('{\r\n');
        await writeSummary(handle, 'Represents a Bootstrap Icon glyph', 1);
        await handle.write('\tpublic enum BootstrapIconGlyph : ushort\r\n');
        await handle.write('\t{\r\n');
        await writeSummary(handle, 'No icon', 2);
        await handle.write(`\t\tNone = 0,\r\n`);
        for (let id in bootstrapIconData) {
            if (!bootstrapIconData.hasOwnProperty(id)) continue;

            let symbol = allSvgIcons.window.document.getElementById(id);

            // If the symbol was not found, the ID is likely an alias, so ignore it
            if (!symbol) continue;

            // Get a PascalCase identifier which is safe to use for an enum member in C#
            let identifier = camelcase(id, {pascalCase: true});
            if (!/^[a-zA-Z_]/.test(identifier)) identifier = '_' + identifier;

            let viewBox = symbol.getAttribute('viewBox').split(' ');
            let svgWidth = viewBox[2];
            let svgHeight = viewBox[3];

            let svgPath = null;

            let children = symbol.querySelectorAll('*');
            if (children.length)
            {
                svgPath = '';
                for (const child of children) {
                    if (child.localName === 'path') {
                        // Sometimes a path starts with a relative moveTo, so we need to reset the path to start at the origin
                        svgPath += 'M0 0 ';
                        // Append the path data
                        svgPath += child.getAttribute('d');
                        svgPath += ' ';
                    } else if (child.localName === 'circle') {
                        // Convert the SVG circle into a path
                        // https://stackoverflow.com/questions/5737975/circle-drawing-with-svgs-arc-path/10477334#10477334
                        let cx = parseFloat(child.getAttribute('cx'));
                        let cy = parseFloat(child.getAttribute('cy'));
                        let r = parseFloat(child.getAttribute('r'));

                        if (!Number.isNaN(cx) && !Number.isNaN(cy) && !Number.isNaN(r)) {
                            // M cx-r cy
                            // a r,r 0 1,0 (r * 2),0
                            // a r,r 0 1,0 -(r * 2),0
                            svgPath += `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`;
                            svgPath += ' ';
                        }
                    }
                }
            }

            if (!svgPath) throw new Error('Failed to find SVG path: ' + id);

            await writeSummary(handle, id + ' icon', 2);
            await handle.write(`\t\t[IconId("${id}")]\r\n`);
            await handle.write('\t\t[SvgPath(' + svgWidth + ', ' + svgHeight + ', "' + svgPath + '")]\r\n');
            await handle.write(`\t\t${identifier} = ${bootstrapIconData[id]},\r\n`);
        }
        await handle.write('\t}\r\n');
        await handle.write('}\r\n');
    } catch (error) {
        console.error('Failed to generate BootstrapIconGlyph enum: ' + error.message);
    } finally {
        if (handle) await handle.close();
    }
})();
