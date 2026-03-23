# Episode 1: Command

Episode 1. Command
Leading IT service provider “Serpent Hill & R.E.E” acquired new project for USA customer. First
delivery is a register, login and logout functionality for their brand new site.
Pedro: Oh, that’s easy. You just need a Command interface…
interface Command {
void execute();
}
Pedro: Every action should implement this interface and define specific execute behaviour.
public class LoginCommand implements Command {
private String user;
private String password;
public LoginCommand(String user, String password) {
this.user = user;
this.password = password;
}
@Override
public void execute() {
DB.login(user, password);
}
}
public class LogoutCommand implements Command {
private String user;
public LogoutCommand(String user) {
this.user = user;
}
@Override
public void execute() {
DB.logout(user);
}
}
Pedro: Usage is simple as well.
(new LoginCommand("django", "unCh@1ned")).execute();
(new LogoutCommand("django")).execute();
Pedro: What do you think, Eve?
Eve: Why are you using redundant wrapping into LoginCommand and just don’t call
DB.login?
Pedro: It’s important to wrap here, because now we can operate on generic Command objects.
Eve: For what purpose?
Pedro: Delayed call, logging, history tracking, caching, plenty of usages.
Eve: Ok, how about that?
(defn execute [command]
(command))
(execute #(db/login "django" "unCh@1ned"))
(execute #(db/logout "django"))
Pedro: What the hell this hash sign?
Eve: A shortcut for javaish
new SomeInterfaceWithOneMethod() {
@Override
public void execute() {
// do
}
};
Pedro: Just like Command interface…
Eve: Or if you want - no-hash solution.
(defn execute [command & args]
(apply command args))
(execute db/login "django" "unCh@1ned")
Pedro: And how do you save function for delayed call in that case?
Eve: Answer yourself. What do you need to call a function?
Pedro: Its name…
Eve: And?
Pedro: …arguments.
Eve: Bingo. All you do is saving a pair (function-name, arguments) and call it whenever you
want using (apply function-name arguments)
Pedro: Hmm… Looks simple.
Eve: Definitely, Command is just a function.
