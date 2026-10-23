# Initial privacy and incident operations

The initial release uses operator-assisted requests. It does not introduce
self-service exports, automated deletion or new retention periods for existing
alumni data. Before launch the college must name an accountable owner, support
contact, approved privacy notice and record-specific retention policy.

For an export/correction/deletion request:

1. Verify the requester through their authenticated account and an independently
   confirmed contact method. Do not accept a supplied user ID as proof of identity.
2. Record a minimal request reference, verification outcome, authorized operator,
   decision and completion date. Never put exported records or credentials in logs.
3. Enforce department scope for department administrators. Cross-department and
   unassigned records require Super Admin/operator review.
4. Export only the requester's authorized data through a reviewed operator process;
   protect other participants' messages/contact details. Transfer it securely to
   the verified requester, not an arbitrary address in the request.
5. Review deletion against institutional retention duties, conversation ownership,
   audit history and authored/shared content. Disable access and revoke sessions
   where appropriate; approve irreversible deletion separately. Do not cascade
   deletes blindly or promise immediate erasure from retained backups.
6. Apply deletion/correction records after any database recovery so a restoration
   does not silently reverse approved privacy actions. Dispose of temporary export
   copies under the approved institutional policy.

For an incident: restrict affected access, preserve safe logs and evidence,
rotate affected secrets and revoke sessions, assess the affected accounts/data,
notify the institutional owner and follow their communication obligations. Restore
only into a verified environment and rerun permission/privacy smoke tests before
reopening. Keep an incident record and corrective actions without copying secrets
or unnecessary personal data into the record.

MFA and durable general-notification retries remain deferred. Review them before
broadening access or introducing multiple backend replicas. Institution-approved
policy and verified operator procedures are launch gates, not automatically
satisfied by installing this code.
