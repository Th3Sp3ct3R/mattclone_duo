import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '../../..');
const primitivesDir = path.join(repoRoot, 'packages/ui/src/primitives');

const pkg = require('@base-ui/react/package.json');
const exportPaths = Object.keys(pkg.exports || {})
  .filter((k) => k.startsWith('./'))
  .filter((k) => !['./package.json', './types', './esm'].includes(k))
  .map((k) => k.slice(2));

function pascalCaseFromKebab(kebab) {
  return kebab
    .split('-')
    .filter(Boolean)
    .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1))
    .join('');
}

function isForwardRefComponent(val) {
  if (!val || typeof val !== 'object') return false;
  const keys = Object.keys(val);
  return keys.includes('$$typeof') && keys.includes('render');
}

function isProbablyComponentKey(key) {
  // Base UI uses PascalCase slot components (Root, Trigger, Item, etc).
  return key.length > 0 && key[0] === key[0].toUpperCase();
}

function renderForwardRefWrapper({ exportName, importPath, defaultClassName, extraProps }) {
  const extraPropsSignature = extraProps?.signature ?? '';
  const extraPropsDefaults = extraProps?.defaults ?? '';
  const extraPropsClassParts = extraProps?.classParts ?? '';
  const extraPropsBeforeReturn = extraProps?.beforeReturn ?? '';

  return `import * as React from 'react';
import { ${exportName} as Base${exportName} } from '@base-ui/react/${importPath}';
import { cx } from '../_utils/cx.js';

export const ${exportName} = React.forwardRef(function ${exportName}(
  { className = '', ${extraPropsDefaults} ...props },
  ref
) {
  const cls = cx('${defaultClassName}', ${extraPropsClassParts} className);
  ${extraPropsBeforeReturn}
  return <Base${exportName} ref={ref} className={cls} {...props} />;
});
`;
}

function renderCompoundWrapper({ exportName, importPath, slotKeys }) {
  const importLine = `import { ${exportName} as Base${exportName} } from '@base-ui/react/${importPath}';`;
  const wrappers = slotKeys
    .map((slotKey) => {
      const name = `${exportName}${slotKey}`;
      const className = `ui-${exportName}${slotKey}`;
      return `const ${slotKey} = React.forwardRef(function ${name}({ className = '', ...props }, ref) {
  return (
    <Base${exportName}.${slotKey}
      ref={ref}
      className={cx('${className}', className)}
      {...props}
    />
  );
});`;
    })
    .join('\n\n');

  const objKeys = slotKeys.join(', ');

  return `import * as React from 'react';
${importLine}
import { cx } from '../_utils/cx.js';

${wrappers}

export const ${exportName} = {
  ...Base${exportName},
  ${objKeys}
};
`;
}

async function main() {
  const results = [];

  for (const importPath of exportPaths) {
    const mod = await import(`@base-ui/react/${importPath}`);
    const exportNames = Object.keys(mod).filter((n) => n !== 'default');

    for (const exportName of exportNames) {
      // Only generate primitives for the PascalCase component exports.
      if (!isProbablyComponentKey(exportName)) continue;

      const val = mod[exportName];
      const folderName = exportName;
      const outDir = path.join(primitivesDir, folderName);
      const outFile = path.join(outDir, `${folderName}.jsx`);

      await fs.mkdir(outDir, { recursive: true });

      let content = '';
      if (isForwardRefComponent(val)) {
        // Special-case Button/Input to preserve existing API sugar (variant/size, invalid, etc).
        if (exportName === 'Button') {
          content = renderForwardRefWrapper({
            exportName,
            importPath,
            defaultClassName: 'ui-Button',
            extraProps: {
              defaults: "variant = 'primary', size = 'md',",
              classParts: "`ui-Button--${variant}`, `ui-Button--${size}`,",
            }
          });
        } else if (exportName === 'Input') {
          content = renderForwardRefWrapper({
            exportName,
            importPath,
            defaultClassName: 'ui-Input',
            extraProps: {
              defaults: "size = 'md', invalid = false,",
              classParts: "`ui-Input--${size}`, invalid ? 'ui-Input--invalid' : '',",
              beforeReturn: "if (invalid) props['aria-invalid'] = true;"
            }
          });
        } else {
          content = renderForwardRefWrapper({
            exportName,
            importPath,
            defaultClassName: `ui-${exportName}`,
            extraProps: { defaults: '', classParts: '' }
          });
        }
      } else if (val && typeof val === 'object') {
        const slotKeys = Object.keys(val).filter((k) => isProbablyComponentKey(k));
        content = renderCompoundWrapper({ exportName, importPath, slotKeys });
      } else {
        // Function exports like DirectionProvider are treated as simple wrappers.
        content = `export { ${exportName} } from '@base-ui/react/${importPath}';\n`;
      }

      await fs.writeFile(outFile, content, 'utf8');
      results.push(outFile);
    }
  }

  // Keep Card as a local primitive (not provided by Base UI).
  const cardDir = path.join(primitivesDir, 'Card');
  await fs.mkdir(cardDir, { recursive: true });
  const cardFile = path.join(cardDir, 'Card.jsx');
  const cardContent = `import * as React from 'react';
import { cx } from '../_utils/cx.js';

export const Card = React.forwardRef(function Card(
  { className = '', as: As = 'div', ...props },
  ref
) {
  return <As ref={ref} className={cx('ui-Card', className)} {...props} />;
});
`;
  await fs.writeFile(cardFile, cardContent, 'utf8');

  // Done.
  console.log(`Generated ${results.length + 1} primitives into ${primitivesDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


