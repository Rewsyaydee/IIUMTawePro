import { useState } from "react";

type UserAvatarProps = {
  photoUrl?: string | null;
  label: string;
  imgClassName?: string;
  textClassName?: string;
  textStyle?: React.CSSProperties;
};

export function UserAvatar({ photoUrl, label, imgClassName = "", textClassName = "", textStyle }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  if (photoUrl && !failed) {
    return <img src={photoUrl} alt={label} className={imgClassName} onError={() => setFailed(true)} />;
  }
  return (
    <span className={textClassName} style={textStyle}>
      {label.charAt(0)}
    </span>
  );
}
