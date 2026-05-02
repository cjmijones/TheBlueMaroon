import React from "react";

export type FileInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      type="file"
      className={`rounded-lg border px-4 py-3 text-sm ${className ?? ""}`}
      {...rest}
    />
  )
);

export default FileInput;
