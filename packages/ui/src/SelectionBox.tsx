
import { useId } from "react";

export default function SelectionBox({label,options, callback, value}:{label:string,options:string[], callback?:(value:string)=>void, value?:string}) {
    const id = useId();
    return (
        <div>    
            <label htmlFor={id} className="mb-2 block text-sm font-medium">
                {label}
              </label>

              <select id={id} value={value ?? ""} className="w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-blue-500" onChange={(e)=> callback && callback(e.target.value)}>
                <option value="" disabled>Select {label}</option>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
        </div>
    );
}
