import { ChangeEventHandler } from "react";

const InputElement = ({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: ChangeEventHandler<HTMLInputElement>;
  label: string;
}) => {
  return (
    <div className="p-2 m-2 border border-black flex flex-col text-center">
      <label className="font-bold">{label}</label>
      <input
        className="text-center appearance-none"
        type="number"
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default InputElement;
