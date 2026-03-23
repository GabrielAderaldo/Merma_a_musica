# Episode 22: Proxy

Episode 22: Proxy
Deren Bart manages the system for making mixed drinks. It is rigid system, because after making a
drink Bart must manually subtract used ingredients from the bar. Do this automatically.
Pedro: Can we get access to his codebase?
Eve: No, but he sent some APIs.
interface IBar {
void makeDrink(Drink drink);
}
interface Drink {
List<Ingredient> getIngredients();
}
interface Ingredient {
String getName();
double getAmount();
}
Pedro: Bart doesn’t want us to modify sources, instead we need to provide some additional
implementation for IBar interface with autosubtracting used ingredients.
Eve: And what are we responsible for?
Pedro: Implementing Proxy Pattern, I’ve read about it some times ago.
Eve: I’m all listening.
Pedro: Basically we delegate all existing functionality to standard IBar implementation and
provide new functionality inside ProxiedBar
class ProxiedBar implements IBar {
BarDatabase bar;
IBar standardBar;
public void makeDrink(Drink drink) {
standardBar.makeDrink(drink);
for (Ingredient i : drink.getIngredients()) {
bar.subtract(i);
}
}
}
Pedro: They need to replace StandardBar implementation with our ProxiedBar.
Eve: Seems super easy.
Pedro: Yes, additional plus that we don’t break existing functionality.
Eve: Are you sure? We didn’t run regression tests.
Pedro: Everything we do is delegating functionality to already tested StandardBar
Eve: But you also substracts used ingredients from BarDatabase
Pedro: We assume, they are decoupled.
Eve: Oh…
Pedro: Does clojure have some alternative?
Eve: Well, I don’t know. What I see here you are using function composition.
Pedro: Explain.
Eve: IBar implementation is a set of functions, and another IBar is another set of functions.
Everything you talking about additional implementation could be covered by function
composition. It’s like make-drink and after that subtract-ingredients from bar.
Pedro: Maybe code is more clear?
Eve: Yes, but I don’t think something special here
;; interface
(defprotocol IBar
(make-drink [this drink]))
;; Bart's implementation
(deftype StandardBar []
IBar
(make-drink [this drink]
(println "Making drink " drink)
:ok))
;; our implementation
(deftype ProxiedBar [db ibar]
IBar
(make-drink [this drink]
(make-drink ibar drink)
(subtract-ingredients db drink)))
;; this how it was before
(make-drink (StandardBar.)
{:name "Manhattan"
:ingredients [["Bourbon" 75] ["Sweet Vermouth" 25] ["Angostura" 5]]})
;; this how it becomes now
(make-drink (ProxiedBar. {:db 1} (StandardBar.))
{:name "Manhattan"
:ingredients [["Bourbon" 75] ["Sweet Vermouth" 25] ["Angostura" 5]]})
Eve: We could leverage protocol and types to group set of functions as a single object.
Pedro: Looks like clojure has object-oriented capabilities as well.
Eve: Correct, moreover it has a reify function, which allow you to create proxies in a runtime
Pedro: Like class in a runtime?
Eve: Sort of.
(reify IBar
(make-drink [this drink]
;; implementation goes here
))
Pedro: Looks handy.
Eve: Yes, but I still don’t understand how it differs from Decorator.
Pedro: They are completely different.
Eve: Decorator adds functionality to the same interface, and so does Proxy.
Pedro: Well, but Proxy is…
Eve: Even more, Adapter is not very different as well.
Pedro: It uses another interface.
Eve: But from implementation perspective all these pattern are the same, wrap something and
delegate calls to wrapper. “Wrapper” could be a good name for these patterns.
