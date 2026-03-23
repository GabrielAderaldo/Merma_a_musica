# Episode 21: Decorator

Episode 21: Decorator
Podrea Vesper caught us on cheating for the tournament. We have a choice: to be busted by police
or to help his super knight to take part in competition
Pedro: I don’t wanna go to prison.
Eve: Me either.
Pedro: Let’s cheat for him one more time.
Eve: This is the same solution, isn’t it?
Pedro Similar, but not the same. Commando was a soldier and they are not allowed on the
tournament. We adapted it. But knight is allowed for tournament we don’t need to adapt it, we
must add functionality to existing object.
Eve: Inheritance or composition?
Pedro: Composition, the main goal of decorator to change behaviour at a runtime
Eve: So how we deal with this super knight?
Pedro: They plan to use Galahad knight and decorate it with more HP and Power Armor
Eve: Heh, funny that cops are playing Fallout
Pedro: Yeah, let’s make knight an abstract class
public class Knight {
protected int hp;
private Knight decorated;
public Knight() { }
public Knight(Knight decorated) {
this.decorated = decorated;
}
public void attackWithSword() {
if (decorated != null) decorated.attackWithSword();
}
public void attackWithBow() {
if (decorated != null) decorated.attackWithBow();
}
public void blockWithShield() {
if (decorated != null) decorated.blockWithShield();
}
}
Eve: So what we improved there?
Pedro: First af all we make class Knight instead of interface to have access to hit points. Then
we provide two diferent constructors, default for standard behaviour, and decorated, which
delegates call to decorated object.
Eve: Is it fair to use abstract class instead of interface?
Pedro: No, but we avoid two classes with similar behaviour and fill each decorated object with
default implementation, instead of forcing to implement each of the methods.
Eve: Ok, what’s about Power Armor?
Pedro: Easy as well
public class KnightWithPowerArmor extends Knight {
public KnightWithPowerArmor(Knight decorated) {
super(decorated);
}
@Override
public void blockWithShield() {
super.blockWithShield();
Armor armor = new PowerArmor();
armor.block();
}
}
public class KnightWithAdditionalHP extends Knight {
public KnightWithAdditionalHP(Knight decorated) {
super(decorated);
this.hp += 50;
}
}
Pedro: Two decorators that fulfils FBI requirements, and we able to create super knight, with
behaviour like Galahad, but super armor and 50 more hit points.
Knight superKnight =
new KnightWithAdditionalHP(
new KnightWithPowerArmor(
new Galahad()));
Eve: Nice trick!
Pedro: You are welcome to show the similar behaviour in clojure
Eve: Here it is
(def galahad {:name "Galahad"
:speed 1.0
:hp 100
:attack-bow-fn attack-with-bow
:attack-sword-fn attack-with-sword
:block-fn block-with-shield})
(defn make-knight-with-more-hp [knight]
(update-in knight [:hp] + 50))
(defn make-knight-with-power-armor [knight]
(update-in knight [:block-fn]
(fn [block-fn]
(fn []
(block-fn)
(block-with-power-armor)))))
;; create the knight
(def superknight (-> galahad
make-knight-with-power-armor
make-knight-with-more-hp)
Pedro: The same functionality.
Eve: Yes, just pay attention to power armor decorator.
