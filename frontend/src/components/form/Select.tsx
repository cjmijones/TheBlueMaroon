import React from "react";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...rest }, ref) => (
    <select
      ref={ref}
      className={`rounded-lg border px-3 py-2 text-sm ${className ?? ""}`}
      {...rest}
    >
      {children}
    </select>
  )
);

export default Select;
