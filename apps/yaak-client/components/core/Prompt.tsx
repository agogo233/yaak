import type { FormInput, JsonPrimitive } from "@yaakapp-internal/plugins";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DynamicForm } from "../DynamicForm";
import { DialogFooter } from "./Dialog";
import { generateId } from "@yaakapp-internal/lib/generateId";

export interface PromptProps {
  inputs: FormInput[];
  onCancel: () => void;
  onResult: (value: Record<string, JsonPrimitive> | null) => void;
  confirmText?: string;
  cancelText?: string;
  onValuesChange?: (values: Record<string, JsonPrimitive>) => void;
  onInputsUpdated?: (cb: (inputs: FormInput[]) => void) => void;
}

export function Prompt({
  onCancel,
  inputs: initialInputs,
  onResult,
  confirmText,
  cancelText,
  onValuesChange,
  onInputsUpdated,
}: PromptProps) {
  const [value, setValue] = useState<Record<string, JsonPrimitive>>({});
  const [inputs, setInputs] = useState<FormInput[]>(initialInputs);
  const { t } = useTranslation();
  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onResult(value);
    },
    [onResult, value],
  );

  // Register callback for external input updates (from plugin dynamic resolution)
  useEffect(() => {
    onInputsUpdated?.(setInputs);
  }, [onInputsUpdated]);

  // Notify of value changes for dynamic resolution
  useEffect(() => {
    onValuesChange?.(value);
  }, [value, onValuesChange]);

  const id = `prompt.form.${useRef(generateId()).current}`;

  return (
    <form id={id} className="grid grid-cols-[minmax(0,1fr)] mb-2" onSubmit={handleSubmit}>
      <DynamicForm inputs={inputs} onChange={setValue} data={value} stateKey={id} />
      <DialogFooter
        inline
        actions={[
          { label: cancelText ?? t("dialog.cancel"), onClick: onCancel },
          { label: confirmText ?? t("dialog.confirm"), color: "primary", form: id },
        ]}
      />
    </form>
  );
}
