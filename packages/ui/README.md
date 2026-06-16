# @julio/ui

Primitives built on [Base UI](https://base-ui.com/) (unstyled, accessible React components).

## Usage

```js
import { Button, Input, Card, Checkbox } from '@julio/ui';
```

### Optional default styles

```js
import '@julio/ui/styles.css';
```

## Styling hooks

- `Button` uses:
  - `ui-Button`, `ui-Button--{variant}`, `ui-Button--{size}`
- `Input` uses:
  - `ui-Input`, `ui-Input--{size}`, `ui-Input--invalid`
- Base UI compound components (e.g. `Dialog`, `Select`, `Toast`) use a consistent slot pattern:
  - `ui-${Component}${Slot}` (example: `ui-AlertDialogTrigger`, `ui-ToastViewport`)


