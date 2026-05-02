import React from "react";

export type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement>;

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={`rounded-lg border px-4 py-3 text-sm ${className ?? ""}`}
      {...rest}
    />
  )
);

export default InputField;
