import * as React from 'react';

export function getSlotKeys(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj).filter((k) => {
    if (k === '$$typeof' || k === 'render') return false;
    return k[0] === k[0].toUpperCase();
  });
}

export function SlotsList({ title, value }) {
  const slots = getSlotKeys(value);
  return (
    <div style={{ fontFamily: 'system-ui', padding: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
      {slots.length === 0 ? (
        <div style={{ marginTop: 8, color: '#64748b' }}>
          No compound slots detected. This primitive likely renders as a single component.
        </div>
      ) : (
        <ul style={{ marginTop: 8 }}>
          {slots.map((s) => (
            <li key={s}>
              <code>{s}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Box({ children }) {
  return (
    <div
      style={{
        fontFamily: 'system-ui',
        padding: 16,
        display: 'grid',
        gap: 12,
        alignContent: 'start'
      }}
    >
      {children}
    </div>
  );
}

/**
 * Attempts to render a meaningful preview for Base UI compound primitives.
 * This is intentionally heuristic-based: it covers common slot patterns so previews
 * aren't blank even when the component needs children to render.
 */
export function AutoPreview({ name, primitive }) {
  const slots = getSlotKeys(primitive);

  // Single-component primitives
  if (!slots.includes('Root')) {
    if (name === 'Input' && primitive) {
      return React.createElement(primitive, { 'aria-label': name, placeholder: name });
    }
    if (name === 'Button' || name === 'Toggle') {
      return React.createElement(primitive, null, name);
    }
    return React.createElement(primitive, null);
  }

  const Root = primitive.Root;

  // Overlay primitives: AlertDialog/Dialog/Popover/Tooltip/PreviewCard/ContextMenu/Menu/Select/etc.
  const Trigger = primitive.Trigger;
  const Portal = primitive.Portal;
  const Popup = primitive.Popup;
  const Backdrop = primitive.Backdrop;
  const Positioner = primitive.Positioner;

  // Collections / items
  const Collection = primitive.Collection;
  const Item = primitive.Item;
  const List = primitive.List;
  const Viewport = primitive.Viewport;
  const Input = primitive.Input;
  const Group = primitive.Group;
  const GroupLabel = primitive.GroupLabel;
  const ItemText = primitive.ItemText;
  const ItemIndicator = primitive.ItemIndicator;

  // Accordion-like
  const Panel = primitive.Panel;

  // Tabs-like
  const TabsList = primitive.List;
  const Tab = primitive.Tab;
  const TabsPanel = primitive.Panel;

  // Toast
  const Provider = primitive.Provider;

  // Checkbox/Radio/Switch/Toggle patterns
  const Indicator = primitive.Indicator;
  const Thumb = primitive.Thumb;

  // Generic: if it’s an Accordion-style (Item + Trigger + Panel)
  if (Item && Trigger && Panel) {
    return (
      <Box>
        <Root>
          <Item>
            <Trigger>Trigger</Trigger>
            <Panel>Panel</Panel>
          </Item>
        </Root>
      </Box>
    );
  }

  // Tabs style
  if (TabsList && Tab && TabsPanel && name === 'Tabs') {
    return (
      <Box>
        <Root defaultValue="one">
          <TabsList style={{ display: 'flex', gap: 8 }}>
            <Tab value="one">One</Tab>
            <Tab value="two">Two</Tab>
          </TabsList>
          <TabsPanel value="one">Panel one</TabsPanel>
          <TabsPanel value="two">Panel two</TabsPanel>
        </Root>
      </Box>
    );
  }

  // Toast needs Provider + Viewport + Root
  if (Provider && Viewport && name === 'Toast') {
    const ToastRoot = primitive.Root;
    const Title = primitive.Title;
    const Description = primitive.Description;
    const Close = primitive.Close;
    return (
      <Box>
        <Provider>
          <Viewport />
          <ToastRoot open>
            {Title ? <Title>Toast</Title> : null}
            {Description ? <Description>Message</Description> : null}
            {Close ? <Close>Close</Close> : null}
          </ToastRoot>
        </Provider>
      </Box>
    );
  }

  // Checkbox/Radio/Switch: Root + Indicator/Thumb
  if ((Indicator || Thumb) && (name === 'Checkbox' || name === 'Radio' || name === 'Switch')) {
    return (
      <Box>
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <Root aria-label={name} defaultChecked>
            {Indicator ? <Indicator>✓</Indicator> : null}
            {Thumb ? <Thumb /> : null}
          </Root>
          <span>{name}</span>
        </label>
      </Box>
    );
  }

  // Generic popup: Root + Trigger + (Portal/Positioner) + Popup.
  if (Trigger && Popup) {
    const Container = Portal || Positioner || React.Fragment;
    const Close = primitive.Close;
    const Title = primitive.Title;
    const Description = primitive.Description;
    return (
      <Box>
        <Root defaultOpen>
          <Trigger>Open</Trigger>
          <Container>
            {Backdrop ? <Backdrop /> : null}
            <Popup style={{ padding: 12, background: 'white', borderRadius: 12 }}>
              {Title ? <Title>Title</Title> : null}
              {Description ? <Description>Description</Description> : null}
              {Close ? <Close>Close</Close> : null}
            </Popup>
          </Container>
        </Root>
      </Box>
    );
  }

  // Autocomplete / Combobox style: Root + Input + Collection + Item
  if (Input && (Collection || List) && Item) {
    const Items = Collection || List;
    return (
      <Box>
        <Root defaultOpen>
          <Input placeholder={name} aria-label={name} />
          <Items>
            {Group && GroupLabel ? (
              <Group>
                <GroupLabel>Group</GroupLabel>
                <Item>
                  {ItemIndicator ? <ItemIndicator /> : null}
                  {ItemText ? <ItemText>Item</ItemText> : 'Item'}
                </Item>
              </Group>
            ) : (
              <Item>
                {ItemIndicator ? <ItemIndicator /> : null}
                {ItemText ? <ItemText>Item</ItemText> : 'Item'}
              </Item>
            )}
          </Items>
        </Root>
      </Box>
    );
  }

  // Collection/List based: Root + List/Collection + Item
  if ((List || Collection) && Item) {
    const Container = List || Collection;
    return (
      <Box>
        <Root defaultOpen>
          <Container>
            <Item>Item</Item>
          </Container>
        </Root>
      </Box>
    );
  }

  // Trigger-only: at least show something clickable when a component expects interaction.
  if (Trigger) {
    return (
      <Box>
        <Root>
          <Trigger>Open</Trigger>
        </Root>
      </Box>
    );
  }

  // Fallback: Root only (avoid throwing, and explain why it might be blank)
  return (
    <Box>
      <Root />
      <div style={{ color: '#64748b' }}>
        No preview template matched. Slots: {slots.join(', ')}
      </div>
    </Box>
  );
}


