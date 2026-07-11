# 11. FAQ

**Q. Where does customer data live?**
Inside the customer's own PostgreSQL and object storage. Not on opsqai.de.

**Q. Can OPSQAI access our install?**
No. There is no callback channel. Recovery is customer-initiated.

**Q. What happens if the Management Center is down?**
Existing installs keep working. Licenses are verified locally against cached signing keys. Only new-license issuance and Bootstrap Recovery Tokens require MC availability.

**Q. What happens if a license expires?**
Module UI is locked; existing data stays intact. Renew, re-import bundle, done.

**Q. Do you train on our data?**
No. The AI provider is chosen by the customer; the training opt-out is governed by the customer's contract with that provider.

**Q. Is this multi-tenant?**
No. Each install is single-tenant by design.

**Q. Is there a SaaS version?**
No. Only the Management Center and Customer Portal run on opsqai.de; they never hold customer operational data.
