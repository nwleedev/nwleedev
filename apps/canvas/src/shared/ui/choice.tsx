import { Button } from "react-aria-components/Button"
import { Label } from "react-aria-components/Label"
import { ListBox, ListBoxItem } from "react-aria-components/ListBox"
import { Popover } from "react-aria-components/Popover"
import { Select, SelectValue } from "react-aria-components/Select"

type ChoiceProps<Value extends string> = {
  label: string
  value: Value
  options: Readonly<Record<Value, string>>
  onChange: (value: Value) => void
  isDisabled?: boolean
  hideLabel?: boolean
}

export function Choice<Value extends string>({ label, value, options, onChange, isDisabled, hideLabel }: ChoiceProps<Value>) {
  const entries = Object.keys(options) as Value[]

  return (
    <Select
      className="choice"
      aria-label={hideLabel ? label : undefined}
      value={value}
      isDisabled={isDisabled}
      onChange={(key) => {
        const next = entries.find((entry) => entry === key)
        if (next !== undefined) onChange(next)
      }}
    >
      {!hideLabel && <Label>{label}</Label>}
      <Button className="choice-trigger">
        <SelectValue />
        <span aria-hidden="true">⌄</span>
      </Button>
      <Popover className="choice-popover">
        <ListBox>
          {entries.map((entry) => <ListBoxItem key={entry} id={entry}>{options[entry]}</ListBoxItem>)}
        </ListBox>
      </Popover>
    </Select>
  )
}
