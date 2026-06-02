UPDATE orders
SET payment_method = 'PAY_AT_STORE'
WHERE payment_method = 'COD';

ALTER TABLE orders
MODIFY COLUMN payment_method ENUM('PAY_AT_STORE', 'STRIPE', 'VNPAY', 'MOMO') NOT NULL;

ALTER TABLE orders
ADD COLUMN checkout_option ENUM('pickup_store', 'pickup_online', 'delivery_online') NULL
AFTER payment_method;

UPDATE orders
SET checkout_option = CASE
  WHEN payment_method = 'VNPAY' AND shipping_fee > 0 THEN 'delivery_online'
  WHEN payment_method = 'VNPAY' AND shipping_fee = 0 THEN 'pickup_online'
  WHEN payment_method = 'PAY_AT_STORE' THEN 'pickup_store'
  ELSE 'pickup_store'
END
WHERE checkout_option IS NULL;
