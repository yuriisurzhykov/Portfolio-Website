import React from "react";

type InputProperties = React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    hint?: string;
};

export function Input({label, hint, className = "", id, ...props}: InputProperties) {
    const inputId = id || `inp_${ Math.random().toString(36).slice(2) }`;
    return (
        <label htmlFor={ inputId } className="block">
            { label && <span className="block mb-1 text-sm text-neutral-300">{ label }</span> }
            <input
                id={ inputId }
                className={ `w-full h-10 px-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-600 ${ className }` }
                { ...props }
            />
            { hint && <span className="mt-1 block text-xs text-neutral-500">{ hint }</span> }
        </label>
    );
}
