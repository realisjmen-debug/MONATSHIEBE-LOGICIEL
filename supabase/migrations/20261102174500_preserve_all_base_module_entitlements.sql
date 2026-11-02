-- Ensure every module included by the base product remains acquired even if
-- an administrator had previously hidden it; enabled add-ons remain acquired add-ons.
update public.school_modules sm
set purchased = true,
    purchase_type = case when mc.default_enabled then 'base' else 'addon' end,
    purchased_at = coalesce(sm.purchased_at, sm.updated_at, now()),
    purchase_price = case when mc.default_enabled then null else coalesce(sm.purchase_price, mc.one_time_price) end,
    purchase_currency = coalesce(sm.purchase_currency, mc.price_currency, 'USD')
from public.module_catalog mc
where mc.module_key = sm.module_key
  and (sm.enabled = true or mc.default_enabled = true);
