# Episode 16: Chain of Responsibility

Episode 16: Chain Of Responsibility
New York marketing organization “A Profit NY” opened request to filter profanity words from their
public chat system.
Pedro: Fuck, they don’t like the word “fuck”?
Eve: It is profit organization, they lose money if someone use profanity words in public chat.
Pedro: Who defined profanity words list?
Eve: George Carlin
Watching and laughing
Pedro: Ok, so let’s just add a filter to replace these rude words with the asterisks.
Eve: Make sure your solution is extendable, other filters could be applied.
Pedro: Chain of Responisibility seems like a good pattern candidate for that. First of all we
make some abstract filter.
public abstract class Filter {
protected Filter nextFilter;
abstract void process(String message);
public void setNextFilter(Filter nextFilter) {
this.nextFilter = nextFilter;
}
}
Pedro: Then, provide implementation for each specific filter you want to apply
class LogFilter extends Filter {
@Override
void process(String message) {
Logger.info(message);
if (nextFilter != null) nextFilter.process(message);
}
}
class ProfanityFilter extends Filter {
@Override
void process(String message) {
String newMessage = message.replaceAll("fuck", "f*ck");
if (nextFilter != null) nextFilter.process(newMessage);
}
}
class RejectFilter extends Filter {
@Override
void process(String message) {
System.out.println("RejectFilter");
if (message.startsWith("[A PROFIT NY]")) {
if (nextFilter != null) nextFilter.process(message);
} else {
// reject message - do not propagate processing
}
}
}
class StatisticsFilter extends Filter {
@Override
void process(String message) {
Statistics.addUsedChars(message.length());
if (nextFilter != null) nextFilter.process(message);
}
}
Pedro: And finally build a chain of filters which defines an order how message will be
processed.
Filter rejectFilter = new RejectFilter();
Filter logFilter = new LogFilter();
Filter profanityFilter = new ProfanityFilter();
Filter statsFilter = new StatisticsFilter();
rejectFilter.setNextFilter(logFilter);
logFilter.setNextFilter(profanityFilter);
profanityFilter.setNextFilter(statsFilter);
String message = "[A PROFIT NY] What the fuck?";
rejectFilter.process(message);
Eve: Ok, now clojure turn. Just define each filter as a function.
;; define filters
(defn log-filter [message]
(logger/log message)
message)
(defn stats-filter [message]
(stats/add-used-chars (count message))
message)
(defn profanity-filter [message]
(clojure.string/replace message "fuck" "f*ck"))
(defn reject-filter [message]
(if (.startsWith message "[A Profit NY]")
message))
Eve: And use some-> macro to chain filters
(defn chain [message]
(some-> message
reject-filter
log-filter
stats-filter
profanity-filter))
Eve: You see how much it is easier, you don’t need every-time call if (nextFilter !=
null) nextFilter.process(), because it’s natural. The next filter defined at the
some-> level naturally, instead of calling manuall setNext.
Pedro: That’s definitely better for composability, but why did you use some-> instead of ->?
Eve: Just for reject-filter. It could stop further processing, so some-> returns nil as
soon as nil encountered as a filter
Pedro: Could you explain more?
Eve: Look at the usage
(chain "fuck") => nil
(chain "[A Profit NY] fuck") => "f*ck"
Pedro: Understood.
Eve: Chain of Responsibility just an approach to function composition
