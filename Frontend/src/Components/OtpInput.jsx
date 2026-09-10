import { useRef, useState } from "react";

const OtpInput = ({ length = 6, onChange }) => {
  const [otp, setOtp] = useState(Array(length).fill(""));
  const inputs = useRef([]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    onChange(newOtp.join(""));

    if (value && index < length - 1) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    const newOtp = Array(length).fill("");
    pasted.split("").forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);
    onChange(newOtp.join(""));
    inputs.current[Math.min(pasted.length, length - 1)].focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="h-14 w-12 rounded-lg border border-slate-300 bg-slate-50 text-center text-2xl font-extrabold text-slate-900 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
        />
      ))}
    </div>
  );
};

export default OtpInput;
