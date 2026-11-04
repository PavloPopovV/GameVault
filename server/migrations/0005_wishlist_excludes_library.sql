-- GV-27: гра не може бути одночасно в бібліотеці і в Wishlist.
-- Міграція даних: прибираємо з Wishlist ігри, які користувач уже додав у бібліотеку.
DELETE FROM "wishlist_items" w
USING "library_entries" le
WHERE le."user_id" = w."user_id" AND le."game_id" = w."game_id";
