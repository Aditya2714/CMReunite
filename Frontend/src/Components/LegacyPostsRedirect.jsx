import { Navigate, useLocation } from "react-router-dom";
export default function LegacyPostsRedirect({ postType }) {
  const { hash } = useLocation();
  return <Navigate replace to={{ pathname: "/community-posts", search: `?type=${postType}`, hash: hash.replace(/^#job-/, "#post-") }} />;
}
