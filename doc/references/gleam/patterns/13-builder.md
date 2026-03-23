# Episode 13: Builder

Episode 13: Builder
Tuck Brass complains that his old automatic coffee-making system is very slow in usage.
Customers can’t wait long enough and going away.
Pedro: Need to understand what’s the problem exactly?
Eve: I’ve researched, system is old, written in COBOL and built around expert system question-
answer. They were very popular long time ago.
Pedro: What do you mean by “question-answer”
Eve: There is operator in front of terminal. System asks: “Do yo want to add water?”, operator
answers “Yes”. Then system asks again: “Do you want to add coffee”, operator answers “Yes”
and so forth.
Pedro: It’s a nightmare, I just want coffee with milk. Why they don’t use predefined options:
coffee with milk, coffee with sugar and so on.
Eve: Because it is the raisin of the system: customer can make coffee with any set of ingridients
by themselves
Pedro: Okay, let’s fix it with Builder pattern.
public class Coffee {
private String coffeeName; // required
private double amountOfCoffee; // required
private double water; // required
private double milk; // optional
private double sugar; // optional
private double cinnamon; // optional
private Coffee() { }
public static class Builder {
private String builderCoffeeName;
private double builderAmountOfCoffee; // required
private double builderWater; // required
private double builderMilk; // optional
private double builderSugar; // optional
private double builderCinnamon; // optional
public Builder() { }
public Builder setCoffeeName(String name) {
this.builderCoffeeName = name;
return this;
}
public Builder setCoffee(double coffee) {
this.builderAmountOfCoffee = coffee;
return this;
}
public Builder setWater(double water) {
this.builderWater = water;
return this;
}
public Builder setMilk(double milk) {
this.builderMilk = milk;
return this;
}
public Builder setSugar(double sugar) {
this.builderSugar = sugar;
return this;
}
public Builder setCinnamon(double cinnamon) {
this.builderCinnamon = cinnamon;
return this;
}
public Coffee make() {
Coffee c = new Coffee();
c.coffeeName = builderCoffeeName;
c.amountOfCoffee = builderAmountOfCoffee;
c.water = builderWater;
c.milk = builderMilk;
c.sugar = builderSugar;
c.cinnamon = builderCinnamon;
// check required parameters and invariants
if (c.coffeeName == null || c.coffeeName.equals("") ||
c.amountOfCoffee <= 0 || c.water <= 0) {
throw new IllegalArgumentException("Provide required parameters");
}
return c;
}
}
}
Pedro: As you see, you can’t instantiate Coffee class easily, you need to set parameters with
nested Builder class
Coffee c = new Coffee.Builder()
.setCoffeeName("Royale Coffee")
.setCoffee(15)
.setWater(100)
.setMilk(10)
.setCinnamon(3)
.make();
Pedro: Calling to method make checks all required parameters, and could validate and throw an
exception if object is in inconsistent state.
Eve: Awesome functionality, but why so verbose?
Pedro: Beat it.
Eve: A piece of cake, clojure supports optional arguments, everything what builder pattern is
about.
(defn make-coffee [name amount water
& {:keys [milk sugar cinnamon]
:or {milk 0 sugar 0 cinnamon 0}}]
;; definition goes here
)
(make-coffee "Royale Coffee" 15 100
:milk 10
:cinnamon 3)
Pedro: Aha, you have three required parameters and three optionals, but required parameters
still without names.
Eve: What do you mean?
Pedro: From the client call I see number 15 but I have no idea what it might be.
Eve: Agreed. Then, let’s make all parameters are named and add precondition for required, the
same way you do with the builder.
(defn make-coffee
[& {:keys [name amount water milk sugar cinnamon]
:or {name "" amount 0 water 0 milk 0 sugar 0 cinnamon 0}}]
{:pre [(not (empty? name))
(> amount 0)
(> water 0)]}
;; definition goes here
)
(make-coffee :name "Royale Coffee"
:amount 15
:water 100
:milk 10
:cinnamon 3)
Eve: As you see all parameters are named and all required params are checked in :pre
constraint. If constraints are violated AssertionError is thrown.
Pedro: Interesting, :pre is a part of a language?
Eve: Sure, it’s just a simple assertion. There is also :post constraint, with the similar effect.
Pedro: Hm, okay. But as you know Builder pattern often used as a mutable datastucture,
StringBuilder for example.
Eve: It’s not a part of clojure philosophy to use mutables, but if you really want, no problem.
Just create a new class with deftype and do not forget to use volatile-mutable on the
properties you want to mutate.
Pedro: Where is the code?
Eve: Here is example of custom implementation of mutable StringBuilder in clojure. It
has a lot of drawbacks and limitations but you’ve got the idea.
;; interface
(defprotocol IStringBuilder
(append [this s])
(to-string [this]))
;; implementation
(deftype ClojureStringBuilder [charray ^:volatile-mutable last-pos]
IStringBuilder
(append [this s]
(let [cs (char-array s)]
(doseq [i (range (count cs))]
(aset charray (+ last-pos i) (aget cs i))))
(set! last-pos (+ last-pos (count s))))
(to-string [this] (apply str (take last-pos charray))))
;; clojure binding
(defn new-string-builder []
(ClojureStringBuilder. (char-array 100) 0))
;; usage
(def sb (new-string-builder))
(append sb "Toby Wong")
(to-string sb) => "Toby Wong"
(append sb " ")
(append sb "Toby Chung") => "Toby Wang Toby Chung"
Pedro: Not as hard as I thought.
