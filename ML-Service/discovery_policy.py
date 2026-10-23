def eligible(account):
    return bool(account and account.get("role") == "alumni" and account.get("isActive") is not False and account.get("isApproved") is True and account.get("approvalStatus") not in {"pending", "rejected"})


def visible(viewer, account, connected, include_self=False, purpose="discovery"):
    if not eligible(account):
        return False
    viewer_id, account_id = str(viewer.get("_id")), str(account.get("_id"))
    if viewer_id == account_id:
        return include_self
    if account_id in {str(value) for value in viewer.get("blockedUsers", [])} or viewer_id in {str(value) for value in account.get("blockedUsers", [])}:
        return False
    privacy = account.get("privacy") or {}
    scope = privacy.get("profileVisibility", "members")
    if scope == "private" or (scope == "network" and account_id not in connected):
        return False
    if purpose == "connect" and privacy.get("allowConnections") is False:
        return False
    if purpose == "mentor" and privacy.get("mentorshipAvailable") is False:
        return False
    return True
