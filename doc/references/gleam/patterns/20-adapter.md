# Episode 20: Adapter

Episode 20: Adapter
Deam Evil conducts a medieval tournament for knights. The prize is $100.000
I’ll pay you the half if you break the system and allow my armed commando to take part in
competition.
Pedro: Finally we’ve got interesting work.
Eve: Funny to see the competition. Especially, M16 vs Iron Sword part.
Pedro: Knights have a good armor.
Eve: F1 grenade does not care about armor.
Pedro: Nevermind, we do the work, we get the money.
Eve: Fifty grands - nice compensation
Pedro: Yes, look at this, I’ve stolen sources of the competition system, though it is not possible
to modify their sources, we can find some vulneravility.
Eve: Here it is
public interface Tournament {
void accept(Knight knight);
}
Pedro: Aha! System validates only incoming types via Knight interface. All we need to do is
to adapt commando to be a knight. Let’s see how knight look like
interface Knight {
void attackWithSword();
void attackWithBow();
void blockWithShield();
}
class Galahad implements Knight {
@Override
public void blockWithShield() {
winkToQueen();
take(shield);
block();
}
@Override
public void attackWithBow() {
winkToQueen();
take(bow);
attack();
}
@Override
public void attackWithSword() {
winkToQueen();
take(sword);
attack();
}
}
Pedro: To accept the commando let’s take an old implementation
class Commando {
void throwGrenade(String grenade) { }
shot(String rifleType) { }
}
Pedro: And adapt it.
class Commando implements Knight {
@Override
public void blockWithShield() {
// commando don't block
}
@Override
public void attackWithBow() {
throwGrenade("F1");
}
@Override
public void attackWithSword() {
shotWithRifle("M16");
}
}
Pedro: That’s it.
Eve: It’s simpler in clojure.
Pedro: Really?
Eve: We don’t love types so their validation won’t work at all
Pedro: So, how do you replace knight with commando?
Eve: Basically, what knight is? It’s a map, consists of data and behaviour
{:name "Lancelot"
:speed 1.0
:attack-bow-fn attack-with-bow
:attack-sword-fn attack-with-sword
:block-fn block-with-shield}
Eve: To adapt commando, just pass his functions instead original ones
{:name "Commando"
:speed 5.0
:attack-bow-fn (partial throw-grenade "F1")
:attack-sword-fn (partial shot "M16")
:block-fn nil}
Pedro: How did we share money?
Eve: 50/50
Pedro: I wrote more code, I want 70
Eve: Ok, 70/70
Pedro: Deal.
