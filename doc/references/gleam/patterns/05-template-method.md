# Episode 5: Template Method

Episode 5. Template Method
MMORPG Mech Dominore Fight Saga requested to implement a game bot for their VIP users.
Not fair.
Pedro: First, we must decide what actions should be automated with bot.
Eve: Have you ever played RPG?
Pedro: Fortunately, no
Eve: Oh my… Let’s go, I’ll show you…
2 weeks later
Pedro: …fantastic, I found epic sword, which has +100 attack.
Eve: Unbelievable. But now, it’s time for bot.
Pedro: Easy-peasy. We could select following events
Battle
Quest
Open Chest
Pedro: Characters behave differently in different events, for example mages cast spells in battle,
but rogues prefer silent melee combat; locked chests are skipped by most characters, but rogues
can unlock them, etc.
Eve: Looks like ideal candidate for Template Method?
Pedro: Yes. We define abstract algorithm, and then specify differences in subclasses.
public abstract class Character {
void moveTo(Location loc) {
if (loc.isQuestAvailable()) {
Journal.addQuest(loc.getQuest());
} else if (loc.containsChest()) {
handleChest(loc.getChest());
} else if (loc.hasEnemies()) {
attack(loc.getEnemies());
}
moveTo(loc.getNextLocation());
}
private void handleChest(Chest chest) {
if (!chest.isLocked()) {
chest.open();
} else {
handleLockedChest(chest);
}
}
abstract void handleLockedChest(Chest chest);
abstract void attack(List<Enemy> enemies);
}
Pedro: We’ve separated to Character class everything common to all characters. Now we
can create subclasses, that define how character should behave in specific situation. In out case:
handling locked chests and attacking enemies.
Eve: Let’s start with a Mage class.
Pedro: Mage? Okay. He can’t open locked chest, so implementation is just do nothing. And if he
is attacking enemies, if there are more than 10 enemies, freeze them, and cast teleport to run
away. If there are 10 enemies or less cast fireball on each of them.
public class MageCharacter extends Character {
@Override
void handleLockedChest(Chest chest) {
// do nothing
}
@Override
void attack(List<Enemy> enemies) {
if (enemies.size() > 10) {
castSpell("Freeze Nova");
castSpell("Teleport");
} else {
for (Enemy e : enemies) {
castSpell("Fireball", e);
}
}
}
}
Eve: Excellent, what about Rogue class?
Pedro: Easy as well, rogues can unlock chests and prefer silent combat, handle enemies one by
one.
public class RogueCharacter extends Character {
@Override
void handleLockedChest(Chest chest) {
chest.unlock();
}
@Override
void attack(List<Enemy> enemies) {
for (Enemy e : enemies) {
invisibility();
attack("backstab", e);
}
}
}
Eve: Excellent. But how this approach is differrent from Strategy?
Pedro: What?
Eve: I mean, you redefined behaviour by using subclasses, but in Strategy pattern you did the
same: redefined behaviour by using functions.
Pedro: Well, another approach.
Eve: State was handled with another approach as well.
Pedro: What are you trying to say?
Eve: You are solving the same kind of problem, but change the approach to it.
Pedro: How do yo solve this problem using strategy in clojure?
Eve: Just pass a set of specific functions for each character. For example, your abstract move
may look like:
(defn move-to [character location]
(cond
(quest? location)
(journal/add-quest (:quest location))
(chest? location)
(handle-chest (:chest location))
(enemies? location)
(attack (:enemies location)))
(move-to character (:next-location location)))
Eve: To add character-specific implementation of methods handle-chest and attack,
implement them and pass as an argument.
;; Mage-specific actions
(defn mage-handle-chest [chest])
(defn mage-attack [enemies]
(if (> (count enemies) 10)
(do (cast-spell "Freeze Nova")
(cast-spell "Teleport"))
;; otherwise
(doseq [e enemies]
(cast-spell "Fireball" e))))
;; Signature of move-to will change to
(defn move-to [character location
& {:keys [handle-chest attack]
:or {handle-chest (fn [chest])
attack (fn [enemies] (run-away))}}]
;; previous implementation
)
Pedro: OMG, what’s happening there?
Eve: We changed signature of move-to to accept handle-chest and attack functions.
Think of them like optional parameters.
(move-to character location
:handle-chest mage-handle-chest
:attack mage-attack)
Eve: Keep in mind that if these functions are not provided we use default behavior: do nothing
for handle-chest and run away from enemies in attack
Pedro: Fine, but is this better than approach by subclassing? Seems that we have a lot of
redundant information in move-to call.
Eve: It’s fixable, just define this call once, and give it alias
(defn mage-move [character location]
(move-to character location
:handle-chest mage-handle-chest
:attack mage-attack))
Eve: Or use multimethods, it’s even better.
(defmulti move
(fn [character location] (:class character)))
(defmethod move :mage [character location]
(move-to character location
:handle-chest mage-handle-chest
:attack mage-attack))
Pedro: I understand. But why do you think pass as argument is better than subclassing?
Eve: You can change behaviour dynamically. Assume your mage has no mana, so instead of
trying to cast fireballs, he can just teleport and run away, you just provide new function.
Pedro: Makes sense. Functions everywhere.
