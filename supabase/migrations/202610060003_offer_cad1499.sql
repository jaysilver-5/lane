-- Reference/catalog price only. Configure CA$14.99 in both stores separately.
-- Never rewrite historical transaction amounts or reject a legitimate older receipt.
begin;
alter table firstlane_private.pack_offers add column if not exists amount_minor integer;
alter table firstlane_private.pack_offers add column if not exists currency text;
update firstlane_private.pack_offers set amount_minor=1499,currency='CAD' where pack_key='CA-ON-G1';
alter table firstlane_private.pack_offers add constraint firstlane_offer_positive_price check(amount_minor is null or amount_minor>0);
alter table firstlane_private.pack_offers add constraint firstlane_offer_currency_format check(currency is null or currency ~ '^[A-Z]{3}$');
commit;
