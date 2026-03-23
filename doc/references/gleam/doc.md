# Documentação Gleam em Português

> Documentação completa da linguagem de programação Gleam, traduzida para português.

---

## Sumário

1. [Tour pela Linguagem Gleam](#tour-pela-linguagem-gleam)
   - [Básico](#básico)
   - [Funções](#funções)
   - [Controle de Fluxo](#controle-de-fluxo)
   - [Tipos de Dados](#tipos-de-dados)
   - [Biblioteca Padrão](#biblioteca-padrão)
   - [Recursos Avançados](#recursos-avançados)
2. [Gleam para Usuários Python](#gleam-para-usuários-python)
3. [Referência da Linha de Comando](#referência-da-linha-de-comando)
4. [Configuração do Projeto (gleam.toml)](#configuração-do-projeto-gleamtoml)
5. [O Language Server Gleam](#o-language-server-gleam)
6. [Criando um Software Bill of Materials (SBoM)](#criando-um-software-bill-of-materials-sbom)

---

# Tour pela Linguagem Gleam

## Básico

### Hello World

Aqui está um pequeno programa que imprime o texto "Hello, Joe!":

```gleam
import gleam/io

pub fn main() {
  io.println("Hello, Joe!")
}
```

Em um projeto Gleam normal, este programa seria executado usando o comando `gleam run` na linha de comando.

### Módulos

O código Gleam é organizado em unidades chamadas **módulos**. Um módulo é um conjunto de definições (de tipos, funções, etc.) que pertencem juntas. Por exemplo, o módulo `gleam/io` contém várias funções para impressão, como `println`.

Todo código Gleam está em algum módulo, cujo nome vem do nome do arquivo em que está. Por exemplo, `gleam/io` está em um arquivo chamado `io.gleam` dentro de um diretório chamado `gleam`.

Para que o código de um módulo acesse o código de outro módulo, usamos a palavra-chave `import`. O nome usado para se referir ao módulo é a última parte do nome do módulo.

A palavra-chave `as` pode ser usada para se referir a um módulo por um nome diferente.

Comentários em Gleam começam com `//` e continuam até o final da linha.

```gleam
import gleam/io
import gleam/string as text

pub fn main() {
  // Usar uma função do módulo `gleam/io`
  io.println("Hello, Mike!")
  // Usar uma função do módulo `gleam/string`
  io.println(text.reverse("Hello, Joe!"))
}
```

### Importações não qualificadas

Normalmente, funções de outros módulos são usadas de forma qualificada, significando que o nome do módulo vai antes do nome da função com um ponto entre eles. Por exemplo, `io.println("Hello!")`.

Também é possível especificar uma lista de funções para importar de um módulo de forma não qualificada:

```gleam
// Importar o módulo e uma de suas funções
import gleam/io.{println}

pub fn main() {
  // Usar a função de forma qualificada
  io.println("Isto é qualificado")
  // Ou de forma não qualificada
  println("Isto é não qualificado")
}
```

Geralmente é melhor usar importações qualificadas, pois isso torna claro onde a função é definida.

### Verificação de Tipos

Gleam possui um robusto sistema de tipos estáticos que ajuda enquanto você escreve e edita código, capturando erros e mostrando onde fazer alterações.

Gleam não possui `null`, não possui conversões implícitas, não possui exceções e sempre realiza verificação completa de tipos. Se o código compila, você pode estar razoavelmente confiante de que não possui inconsistências que possam causar bugs ou crashes.

```gleam
import gleam/io

pub fn main() {
  io.println("Meu número da sorte é:")
  // io.println(4)
  // Descomente esta linha para ver o erro
  // echo 4
  // Você pode usar `echo` para debug-print de qualquer tipo!
}
```

### Ints (Inteiros)

O tipo `Int` de Gleam representa números inteiros. Existem operadores aritméticos e de comparação para ints, bem como o operador de igualdade que funciona para todos os tipos.

Na máquina virtual Erlang, ints não têm tamanho máximo nem mínimo. Em runtimes JavaScript, ints são representados usando números de ponto flutuante de 64 bits.

```gleam
import gleam/int

pub fn main() {
  // Aritmética de inteiros
  echo 1 + 1
  echo 5 - 1
  echo 5 / 2
  echo 3 * 3
  echo 5 % 2

  // Comparações de inteiros
  echo 3 > 1 + 1
  echo 2 < 1 - 1

  // Igualdade funciona para qualquer tipo
  echo 2 == 1 + 1

  // Funções da biblioteca padrão para int
  echo int.max(42, 77)
  echo int.clamp(5, 10, 20)
}
```

### Floats (Ponto Flutuante)

O tipo `Float` de Gleam representa números que não são inteiros. Os operadores numéricos de Gleam não são sobrecarregados, então existem operadores dedicados para trabalhar com floats (com `.` no final).

Floats são representados como números de ponto flutuante de 64 bits em ambos os runtimes Erlang e JavaScript.

Divisão por zero não causará overflow; em vez disso, é definida como zero.

```gleam
import gleam/float

pub fn main() {
  // Aritmética de float
  echo 1.0 +. 1.5
  echo 5.0 -. 1.5
  echo 5.0 /. 2.5
  echo 3.0 *. 3.5

  // Comparações de float
  echo 2.2 >. 1.0
  echo 2.2 <. 1.0

  // Divisão por zero não é erro
  echo 3.14 /. 0.0

  // Funções da biblioteca padrão para float
  echo float.max(2.0, 9.5)
  echo float.ceiling(5.4)
}
```

### Formatos Numéricos

Underscores podem ser adicionados a números para clareza. Por exemplo, `1_000_000` é mais fácil de ler que `1000000`.

Ints podem ser escritos em formatos binário, octal ou hexadecimal usando os prefixos `0b`, `0o` e `0x`.

Floats podem ser escritos em notação científica.

```gleam
pub fn main() {
  // Underscores
  echo 1_000_000
  echo 10_000.01

  // Literais Int em binário, octal e hex
  echo 0b00001111
  echo 0o17
  echo 0xF

  // Notação científica para Float
  echo 7.0e7
  echo 3.0e-4
}
```

### Igualdade

Gleam tem os operadores `==` e `!=` para verificar igualdade. Os operadores podem ser usados com valores de qualquer tipo, mas ambos os lados devem ser do mesmo tipo.

A igualdade é verificada **estruturalmente**, ou seja, dois valores são iguais se possuem a mesma estrutura (e não se estão no mesmo local de memória).

```gleam
pub fn main() {
  echo 100 == 50 + 50
  echo 1.5 != 0.1 *. 10.0
}
```

### Strings

Em Gleam, strings são escritas como texto cercado por aspas duplas e podem abranger múltiplas linhas e conter caracteres unicode.

O operador `<>` pode ser usado para concatenar strings.

Sequências de escape suportadas: `\"`, `\\`, `\f`, `\n`, `\r`, `\t`, `\u{xxxxxx}`

```gleam
import gleam/io
import gleam/string

pub fn main() {
  io.println("こんにちは Gleam")
  io.println("multi\nlinha\nstring")
  io.println("\u{1F600}")

  // Aspas duplas podem ser escapadas
  io.println("\"X\" marca o ponto")

  // Concatenação de strings
  io.println("Um " <> "Dois")

  // Funções de string
  io.println(string.reverse("1 2 3 4 5"))
  io.println(string.append("abc", "def"))
}
```

### Bools (Booleanos)

Um `Bool` é `True` ou `False`. Os operadores `||`, `&&` e `!` podem ser usados para manipular bools.

Os operadores `||` e `&&` são **short-circuiting** (avaliação de curto-circuito): se o lado esquerdo for `True` para `||` ou `False` para `&&`, o lado direito não será avaliado.

```gleam
import gleam/bool

pub fn main() {
  echo True && False
  echo True && True
  echo False || False
  echo False || True
  echo bool.to_string(True)
}
```

### Atribuições

Um valor pode ser atribuído a uma variável usando `let`. Nomes de variáveis podem ser reutilizados por atribuições `let` posteriores, mas os valores que eles referenciam são **imutáveis**.

Em Gleam, nomes de variáveis e funções são escritos em `snake_case`.

```gleam
import gleam/io

pub fn main() {
  let x = "Original"
  io.println(x)

  let y = x
  io.println(y)

  // Atribuir `x` a um novo valor
  let x = "Novo"
  io.println(x)

  // `y` ainda se refere ao valor original
  io.println(y)
}
```

### Padrões de Descarte

Se uma variável é atribuída mas não usada, Gleam emitirá um aviso. Para silenciar o aviso, o nome pode ser prefixado com um underscore:

```gleam
pub fn main() {
  let _score = 1000
}
```

### Anotações de Tipo

Atribuições `let` podem ser escritas com uma anotação de tipo após o nome. Anotações de tipo são úteis para documentação, mas não mudam como Gleam verifica o código.

```gleam
pub fn main() {
  let _name: String = "Gleam"
  let _is_cool: Bool = True
  let _version: Int = 1
}
```

### Importações de Tipo

Tipos de outros módulos precisam ser importados. Tipos podem ser referenciados de forma qualificada ou importados de forma não qualificada com a palavra `type` antes do nome do tipo.

Diferente de funções, tipos em Gleam são comumente importados de forma não qualificada.

```gleam
import gleam/bytes_tree
import gleam/string_tree.{type StringTree}

pub fn main() {
  // Referindo-se a um tipo de forma qualificada
  let _bytes: bytes_tree.BytesTree = bytes_tree.new()

  // Referindo-se a um tipo de forma não qualificada
  let _text: StringTree = string_tree.new()
}
```

### Aliases de Tipo

Um alias de tipo pode ser usado para se referir a um tipo por um nome diferente. Dar um alias a um tipo **não cria** um novo tipo.

O nome de um tipo sempre começa com letra maiúscula. Use `pub` para torná-lo público.

> **Nota:** Aliases de tipo devem ser usados raramente. Usar um tipo customizado oferece mais segurança de tipos.

```gleam
pub type Number = Int

pub fn main() {
  let one: Number = 1
  let two: Int = 2
  echo one == two
}
```

### Blocos

Blocos são uma ou mais expressões agrupadas com chaves. Cada expressão é avaliada em ordem e o valor da última é retornado.

Variáveis atribuídas dentro do bloco só podem ser usadas dentro dele.

Blocos também podem ser usados para alterar a ordem de avaliação de operadores binários:

```gleam
pub fn main() {
  let fahrenheit = {
    let degrees = 64
    degrees
  }

  // Alterando a ordem de avaliação
  let celsius = { fahrenheit - 32 } * 5 / 9
  echo celsius
}
```

### Listas

Listas são coleções ordenadas de valores. `List` é um tipo genérico com um parâmetro para o tipo dos valores. Uma lista de ints tem tipo `List(Int)`.

Listas são **listas ligadas simples imutáveis**, muito eficientes para adicionar e remover elementos do início.

Contar o comprimento ou acessar elementos em outras posições é custoso.

```gleam
pub fn main() {
  let ints = [1, 2, 3]
  echo ints

  // Preceder de forma imutável
  echo [-1, 0, ..ints]

  // As listas originais não mudam
  echo ints
}
```

### Constantes

Constantes são definidas no nível superior de um módulo com `const`. Devem ser valores literais (funções não podem ser usadas em suas definições).

```gleam
const ints: List(Int) = [1, 2, 3]
const floats = [1.1, 2.2, 3.3]

pub fn main() {
  echo ints
  echo floats
}
```

---

## Funções

### Definindo Funções

A palavra-chave `fn` é usada para definir novas funções. Cada expressão no corpo da função é avaliada em ordem e o valor da última é retornado. Gleam é uma linguagem **baseada em expressões**, então não há operador `return`.

Funções sem `pub` são **privadas** — só podem ser usadas dentro do módulo.

É considerado boa prática usar anotações de tipo para funções.

```gleam
pub fn main() {
  echo double(10)
}

fn double(a: Int) -> Int {
  multiply(a, 2)
}

fn multiply(a: Int, b: Int) -> Int {
  a * b
}
```

### Funções de Ordem Superior

Em Gleam, funções são valores. Podem ser atribuídas a variáveis e passadas como argumentos.

```gleam
pub fn main() {
  echo twice(1, add_one)

  let my_function = add_one
  echo my_function(100)
}

fn twice(argument: Int, passed_function: fn(Int) -> Int) -> Int {
  passed_function(passed_function(argument))
}

fn add_one(argument: Int) -> Int {
  argument + 1
}
```

### Funções Anônimas

Gleam tem literais de funções anônimas, escritos com a sintaxe `fn() { ... }`. Podem ser usadas de forma intercambiável com funções nomeadas. Funções anônimas podem referenciar variáveis que estavam no escopo quando foram definidas (são **closures**).

```gleam
pub fn main() {
  let add_one = fn(a) { a + 1 }
  echo twice(1, add_one)

  // Passar uma função anônima como argumento
  echo twice(1, fn(a) { a * 2 })

  let secret_number = 42
  let secret = fn() { secret_number }
  echo secret()
}

fn twice(argument: Int, my_function: fn(Int) -> Int) -> Int {
  my_function(my_function(argument))
}
```

### Captura de Função

Gleam tem uma sintaxe abreviada para criar funções anônimas que chamam outra função com um placeholder `_`:

A função `fn(a) { some_function(..., a, ...) }` pode ser escrita como `some_function(..., _, ...)`.

```gleam
pub fn main() {
  // Estas duas instruções são equivalentes
  let add_one_v1 = fn(x) { add(1, x) }
  let add_one_v2 = add(1, _)

  echo add_one_v1(10)
  echo add_one_v2(10)
}

fn add(a: Int, b: Int) -> Int {
  a + b
}
```

### Funções Genéricas

Gleam suporta **generics** (polimorfismo paramétrico). Variáveis de tipo são escritas com nomes em letras minúsculas e são substituídas por um tipo específico cada vez que a função é chamada.

```gleam
pub fn main() {
  let add_one = fn(x) { x + 1 }
  let exclaim = fn(x) { x <> "!" }

  // Aqui a variável de tipo é substituída por Int
  echo twice(10, add_one)
  // Aqui a variável de tipo é substituída por String
  echo twice("Hello", exclaim)
}

fn twice(argument: value, my_function: fn(value) -> value) -> value {
  my_function(my_function(argument))
}
```

### Pipelines (Encadeamento)

O operador pipe `|>` permite escrever código de cima para baixo, passando o resultado da expressão à esquerda como argumento para a função à direita.

O pipe primeiro verifica se o valor pode ser usado como o **primeiro argumento**. Por exemplo, `a |> b(1, 2)` se torna `b(a, 1, 2)`.

Para encadear em uma posição diferente, use captura de função.

Para debug em um pipeline, use `|> echo`.

```gleam
import gleam/io
import gleam/string

pub fn main() {
  // Sem o operador pipe
  io.println(string.drop_start(string.drop_end("Hello, Joe!", 1), 7))

  // Com o operador pipe
  "Hello, Mike!"
  |> string.drop_end(1)
  |> string.drop_start(7)
  |> io.println

  // Alterando a ordem com captura de função
  "1"
  |> string.append("2")
  |> string.append("3", _)
  |> io.println
}
```

### Argumentos Rotulados

Gleam suporta **argumentos rotulados** (labelled arguments), onde argumentos de função recebem um rótulo externo além do nome interno. Quando rótulos são usados, a ordem dos argumentos não importa.

Não há custo de performance. Rótulos são opcionais ao chamar a função.

```gleam
pub fn main() {
  // Sem rótulos
  echo calculate(1, 2, 3)
  // Usando rótulos
  echo calculate(1, add: 2, multiply: 3)
  // Rótulos em ordem diferente
  echo calculate(1, multiply: 3, add: 2)
}

fn calculate(value: Int, add addend: Int, multiply multiplier: Int) {
  value * multiplier + addend
}
```

### Sintaxe Abreviada de Rótulos

Quando variáveis locais têm os mesmos nomes dos argumentos rotulados de uma função, os nomes das variáveis podem ser omitidos:

```gleam
pub fn main() {
  let quantity = 5.0
  let unit_price = 10.0
  let discount = 0.2

  // Sintaxe regular
  echo calculate_total_cost(quantity: quantity, unit_price: unit_price, discount: discount)

  // Sintaxe abreviada
  echo calculate_total_cost(quantity:, unit_price:, discount:)
}

fn calculate_total_cost(
  quantity quantity: Float,
  unit_price price: Float,
  discount discount: Float,
) -> Float {
  let subtotal = quantity *. price
  let discount = subtotal *. discount
  subtotal -. discount
}
```

### Comentários de Documentação

Gleam tem `///` para documentar tipos e funções (colocados imediatamente antes) e `////` para documentar módulos (colocados no topo).

```gleam
//// Um módulo contendo algumas funções incomuns.

/// Chama uma função duas vezes com um valor inicial.
pub fn twice(argument: value, my_function: fn(value) -> value) -> value {
  my_function(my_function(argument))
}
```

### Depreciações

Funções podem ser marcadas como depreciadas usando o atributo `@deprecated`. O compilador emitirá um aviso quando uma função depreciada for referenciada:

```gleam
@deprecated("Use new_function em vez disso")
fn old_function() {
  Nil
}
```

---

## Controle de Fluxo

### Expressões Case

A expressão `case` é a forma mais comum de controle de fluxo em Gleam. Permite dizer "se os dados tiverem esta forma, execute este código" — um processo chamado **pattern matching** (correspondência de padrões).

Gleam realiza **verificação de exaustividade** para garantir que os padrões cobrem todos os valores possíveis.

```gleam
import gleam/int

pub fn main() {
  let x = int.random(5)
  echo x

  let result = case x {
    // Corresponder valores específicos
    0 -> "Zero"
    1 -> "Um"
    // Corresponder qualquer outro valor
    _ -> "Outro"
  }
  echo result
}
```

### Padrões de Variável

Padrões em expressões case podem atribuir variáveis:

```gleam
import gleam/int

pub fn main() {
  let result = case int.random(5) {
    0 -> "Zero"
    1 -> "Um"
    other -> "É " <> int.to_string(other)
  }
  echo result
}
```

### Padrões de String

O operador `<>` pode ser usado para corresponder strings com um prefixo específico:

```gleam
fn get_name(x: String) -> String {
  case x {
    "Hello, " <> name -> name
    _ -> "Desconhecido"
  }
}
```

### Padrões de Lista

Listas podem ser correspondidas em expressões case. `[]` corresponde a uma lista vazia, `[_]` corresponde a uma lista com um elemento. O padrão `..` pode ser usado para corresponder o restante:

```gleam
import gleam/int
import gleam/list

pub fn main() {
  let x = list.repeat(int.random(5), times: int.random(3))
  echo x

  let result = case x {
    [] -> "Lista vazia"
    [1] -> "Lista com apenas 1"
    [4, ..] -> "Lista começando com 4"
    [_, _] -> "Lista com 2 elementos"
    _ -> "Outra lista"
  }
  echo result
}
```

### Recursão

Gleam **não tem loops**. A iteração é feita através de recursão. Uma função recursiva precisa de pelo menos um **caso base** e um **caso recursivo**.

```gleam
pub fn main() {
  echo factorial(5)
  echo factorial(7)
}

pub fn factorial(x: Int) -> Int {
  case x {
    // Caso base
    0 -> 1
    1 -> 1
    // Caso recursivo
    _ -> x * factorial(x - 1)
  }
}
```

### Tail Calls (Chamadas de Cauda)

Gleam suporta **otimização de chamada de cauda**, permitindo que o stack frame da função atual seja reutilizado se a chamada de função for a última coisa que a função faz.

Funções recursivas não otimizadas podem ser reescritas usando um **acumulador**:

```gleam
pub fn factorial(x: Int) -> Int {
  factorial_loop(x, 1)
}

fn factorial_loop(x: Int, accumulator: Int) -> Int {
  case x {
    0 -> accumulator
    1 -> accumulator
    _ -> factorial_loop(x - 1, accumulator * x)
  }
}
```

### Recursão em Listas

O padrão `[first, ..rest]` pode ser usado para iterar sobre uma lista:

```gleam
pub fn main() {
  let sum = sum_list([18, 56, 35, 85, 91], 0)
  echo sum
}

fn sum_list(list: List(Int), total: Int) -> Int {
  case list {
    [first, ..rest] -> sum_list(rest, total + first)
    [] -> total
  }
}
```

### Múltiplos Sujeitos

É possível fazer pattern matching em múltiplos valores ao mesmo tempo:

```gleam
import gleam/int

pub fn main() {
  let x = int.random(2)
  let y = int.random(2)

  let result = case x, y {
    0, 0 -> "Ambos são zero"
    0, _ -> "Primeiro é zero"
    _, 0 -> "Segundo é zero"
    _, _ -> "Nenhum é zero"
  }
  echo result
}
```

### Padrões Alternativos

Padrões alternativos podem ser dados usando o operador `|`:

```gleam
import gleam/int

pub fn main() {
  let number = int.random(10)

  let result = case number {
    2 | 4 | 6 | 8 -> "Número par"
    1 | 3 | 5 | 7 -> "Número ímpar"
    _ -> "Não tenho certeza"
  }
  echo result
}
```

### Aliases de Padrão

O operador `as` pode atribuir sub-padrões a variáveis:

```gleam
fn get_first_non_empty(lists: List(List(t))) -> List(t) {
  case lists {
    [[_, ..] as first, ..] -> first
    [_, ..rest] -> get_first_non_empty(rest)
    [] -> []
  }
}
```

### Guards (Guardas)

A palavra-chave `if` pode ser usada em expressões case para adicionar uma condição extra ao padrão:

```gleam
fn get_first_larger(numbers: List(Int), limit: Int) -> Int {
  case numbers {
    [first, ..] if first > limit -> first
    [_, ..rest] -> get_first_larger(rest, limit)
    [] -> 0
  }
}
```

> **Nota:** Expressões guard não podem conter chamadas de função, expressões case ou blocos.

---

## Tipos de Dados

### Tuplas

Tuplas permitem combinar múltiplos valores de tipos diferentes. São mais usadas para retornar 2 ou 3 valores de uma função.

A sintaxe `some_tuple.0` obtém o primeiro elemento, `.1` o segundo, etc.

```gleam
pub fn main() {
  let triple = #(1, 2.2, "três")
  echo triple

  let #(a, _, _) = triple
  echo a
  echo triple.1
}
```

### Tipos Customizados

Tipos customizados permitem criar tipos inteiramente novos. São definidos com a palavra-chave `type`, seguida do nome e construtores para cada variante.

```gleam
pub type Season {
  Spring
  Summer
  Autumn
  Winter
}

pub fn main() {
  echo weather(Spring)
  echo weather(Autumn)
}

fn weather(season: Season) -> String {
  case season {
    Spring -> "Ameno"
    Summer -> "Quente"
    Autumn -> "Ventoso"
    Winter -> "Frio"
  }
}
```

### Records (Registros)

Uma variante de um tipo customizado pode conter outros dados. Os campos podem ter rótulos.

É comum ter um tipo customizado com uma única variante que contém dados — o equivalente Gleam de um struct:

```gleam
pub type Person {
  Person(name: String, age: Int, needs_glasses: Bool)
}

pub fn main() {
  let amy = Person("Amy", 26, True)
  let jared = Person(name: "Jared", age: 31, needs_glasses: True)
  let tom = Person("Tom", 28, needs_glasses: False)
  echo [amy, jared, tom]
}
```

### Acessores de Record

A sintaxe `record.field_label` pode ser usada para obter valores de um record:

```gleam
pub type SchoolPerson {
  Teacher(name: String, subject: String)
  Student(name: String)
}

pub fn main() {
  let teacher = Teacher("Sr. Schofield", "Física")
  let student = Student("Koushiar")
  echo teacher.name
  echo student.name
}
```

### Pattern Matching em Records

É possível fazer pattern matching em records. Use `_` ou `..` para descartar campos:

```gleam
import gleam/io

pub type Fish {
  Starfish(name: String, favourite_colour: String)
  Jellyfish(name: String, jiggly: Bool)
}

pub type IceCream {
  IceCream(flavour: String)
}

pub fn main() {
  handle_fish(Starfish("Lucy", "Rosa"))
  handle_ice_cream(IceCream("morango"))
}

fn handle_fish(fish: Fish) {
  case fish {
    Starfish(_, favourite_colour) -> io.println(favourite_colour)
    Jellyfish(name, ..) -> io.println(name)
  }
}

fn handle_ice_cream(ice_cream: IceCream) {
  // Se o tipo customizado tem uma única variante, pode
  // desestruturar usando `let` em vez de case!
  let IceCream(flavour) = ice_cream
  io.println(flavour)
}
```

### Atualização de Record

A sintaxe de atualização de record cria um novo record a partir de um existente, com alguns campos alterados. Gleam é imutável, então o original não é modificado:

```gleam
pub type Teacher {
  Teacher(name: String, subject: String, floor: Int, room: Int)
}

pub fn main() {
  let teacher1 = Teacher(name: "Sr. Dodd", subject: "TI", floor: 2, room: 2)
  let teacher2 = Teacher(..teacher1, subject: "Ed. Física", room: 6)
  echo teacher1
  echo teacher2
}
```

### Tipos Customizados Genéricos

Tipos customizados também podem ser genéricos:

```gleam
pub type Option(inner) {
  Some(inner)
  None
}

pub const name: Option(String) = Some("Annah")
pub const level: Option(Int) = Some(10)
```

### Nil

`Nil` é o tipo unitário de Gleam. É retornado por funções que não têm nada a retornar. `Nil` **não** é um valor válido de nenhum outro tipo — valores em Gleam não são nullable.

```gleam
import gleam/io

pub fn main() {
  let x = Nil
  echo x

  let result = io.println("Hello!")
  echo result == Nil
}
```

### Results (Resultados)

Gleam **não usa exceções**. Computações que podem ter sucesso ou falhar retornam um valor do tipo `Result(value, error)`:

- `Ok` — contém o valor de retorno de uma computação bem-sucedida
- `Error` — contém o motivo de uma computação falha

```gleam
import gleam/int

pub type PurchaseError {
  NotEnoughMoney(required: Int)
  NotLuckyEnough
}

fn buy_pastry(money: Int) -> Result(Int, PurchaseError) {
  case money >= 5 {
    True ->
      case int.random(4) == 0 {
        True -> Error(NotLuckyEnough)
        False -> Ok(money - 5)
      }
    False -> Error(NotEnoughMoney(required: 5))
  }
}
```

### Bit Arrays

Bit arrays representam uma sequência de 1s e 0s, com uma sintaxe conveniente para construir e manipular dados binários:

Opções de segmento: `size`, `unit`, `bits`, `bytes`, `float`, `int`, `big`, `little`, `native`, `utf8`, `utf16`, `utf32`, `signed`, `unsigned`.

```gleam
pub fn main() {
  // Int de 8 bits
  echo <<3>>
  echo <<3>> == <<3:size(8)>>

  // Int de 16 bits
  echo <<6147:size(16)>>

  // Dados UTF8
  echo <<"Hello, Joe!":utf8>>

  // Concatenação
  let first = <<4>>
  let second = <<2>>
  echo <<first:bits, second:bits>>
}
```

---

## Biblioteca Padrão

A biblioteca padrão de Gleam é um pacote regular publicado no repositório de pacotes Hex. Quase todos os projetos dependem dela.

### Módulo List

O módulo `gleam/list` contém funções para trabalhar com listas:

- **map** — cria nova lista aplicando uma função a cada elemento
- **filter** — cria nova lista com elementos que satisfazem uma condição
- **fold** — combina todos os elementos em um único valor
- **find** — retorna o primeiro elemento que satisfaz uma condição

```gleam
import gleam/io
import gleam/list

pub fn main() {
  let ints = [0, 1, 2, 3, 4, 5]

  io.println("=== map ===")
  echo list.map(ints, fn(x) { x * 2 })

  io.println("=== filter ===")
  echo list.filter(ints, fn(x) { x % 2 == 0 })

  io.println("=== fold ===")
  echo list.fold(ints, 0, fn(count, e) { count + e })

  io.println("=== find ===")
  let _ = echo list.find(ints, fn(x) { x > 3 })
  echo list.find(ints, fn(x) { x > 13 })
}
```

### Módulo Result

O módulo `gleam/result` contém funções para trabalhar com resultados:

- **map** — atualiza um valor dentro de `Ok`
- **try** — executa uma função que retorna Result sobre o valor em `Ok`
- **unwrap** — extrai o valor de sucesso ou retorna um valor padrão

```gleam
import gleam/int
import gleam/io
import gleam/result

pub fn main() {
  io.println("=== map ===")
  let _ = echo result.map(Ok(1), fn(x) { x * 2 })
  let _ = echo result.map(Error(1), fn(x) { x * 2 })

  io.println("=== try ===")
  let _ = echo result.try(Ok("1"), int.parse)
  let _ = echo result.try(Ok("no"), int.parse)

  io.println("=== unwrap ===")
  echo result.unwrap(Ok("1234"), "default")
  echo result.unwrap(Error(Nil), "default")

  io.println("=== pipeline ===")
  int.parse("-1234")
  |> result.map(int.absolute_value)
  |> result.try(int.remainder(_, 42))
  |> echo
}
```

### Módulo Dict

O módulo `gleam/dict` define o tipo `Dict` (dicionário/hashmap):

- `new` e `from_list` criam novos dicts
- `insert` e `delete` adicionam e removem itens
- Dicts são imutáveis e **não ordenados**

```gleam
import gleam/dict

pub fn main() {
  let scores = dict.from_list([#("Lucy", 13), #("Drew", 15)])
  echo scores

  let scores =
    scores
    |> dict.insert("Bushra", 16)
    |> dict.insert("Darius", 14)
    |> dict.delete("Drew")
  echo scores
}
```

### Módulo Option

O módulo `gleam/option` define o tipo `Option` para representar valores presentes ou ausentes:

```gleam
import gleam/option.{type Option, None, Some}

pub type Person {
  Person(name: String, pet: Option(String))
}

pub fn main() {
  let person_with_pet = Person("Al", Some("Nubi"))
  let person_without_pet = Person("Maria", None)
  echo person_with_pet
  echo person_without_pet
}
```

---

## Recursos Avançados

### Tipos Opacos

Tipos opacos são tipos onde o tipo em si é público, mas os construtores são privados. Isso é útil para criar **construtores inteligentes**:

```gleam
pub opaque type PositiveInt {
  PositiveInt(inner: Int)
}

pub fn new(i: Int) -> PositiveInt {
  case i >= 0 {
    True -> PositiveInt(i)
    False -> PositiveInt(0)
  }
}

pub fn to_int(i: PositiveInt) -> Int {
  i.inner
}
```

### Use

A expressão `use` de Gleam serve para chamar funções que recebem um callback como argumento sem aumentar a indentação do código.

Todo o código abaixo do `use` se torna uma função anônima passada como argumento final:

```gleam
// Este código:
pub fn main() -> Nil {
  use a, b <- my_function
  next(a)
  next(b)
}

// Expande para:
pub fn main() -> Nil {
  my_function(fn(a, b) {
    next(a)
    next(b)
  })
}
```

Exemplo prático com `result.try`:

```gleam
import gleam/result

pub fn with_use() -> Result(String, Nil) {
  use username <- result.try(get_username())
  use password <- result.try(get_password())
  use greeting <- result.map(log_in(username, password))
  greeting <> ", " <> username
}
```

### Todo

A palavra-chave `todo` especifica código ainda não implementado. O compilador emitirá um aviso, e o programa crashará se executado:

```gleam
pub fn main() {
  todo as "Ainda não escrevi este código!"
}
```

### Panic

A palavra-chave `panic` é usada para crashar o programa quando um ponto que nunca deveria ser alcançado é atingido:

```gleam
pub fn print_score(score: Int) {
  case score {
    score if score > 1000 -> io.println("Pontuação alta!")
    score if score > 0 -> io.println("Ainda trabalhando nisso")
    _ -> panic as "Pontuações nunca devem ser negativas!"
  }
}
```

> **Nota:** Esta palavra-chave quase nunca deve ser usada! Com tipos bem projetados, o sistema de tipos pode tornar esses estados inválidos irrepresentáveis.

### Let Assert

`let assert` é uma forma de pattern matching parcial que crasha se o padrão não corresponder:

```gleam
pub fn unsafely_get_first_element(items: List(a)) -> a {
  let assert [first, ..] = items as "A lista não deveria estar vazia"
  first
}
```

### Bool Assert

`bool assert` (usando `assert`) verifica se um valor booleano é `True`. Projetado para código de teste:

```gleam
pub fn main() {
  assert add(1, 2) == 3
  assert add(1, 2) < add(1, 3)
  assert add(6, 2) == add(2, 6) as "Adição deveria ser comutativa"
}
```

### Externals (Funções Externas)

Gleam permite usar código escrito em outras linguagens (Erlang, JavaScript) através de funções e tipos externos:

```gleam
// Um tipo sem construtores Gleam
pub type DateTime

// Uma função externa
@external(javascript, "./my_package_ffi.mjs", "now")
pub fn now() -> DateTime

pub fn main() {
  echo now()
}
```

Múltiplas implementações podem ser especificadas para diferentes plataformas:

```gleam
pub type DateTime

@external(erlang, "calendar", "local_time")
@external(javascript, "./my_package_ffi.mjs", "now")
pub fn now() -> DateTime
```

É possível ter tanto uma implementação Gleam quanto uma externa. Se existir uma implementação externa para o alvo atual, ela será usada; caso contrário, a implementação Gleam é usada:

```gleam
@external(erlang, "lists", "reverse")
pub fn reverse_list(items: List(e)) -> List(e) {
  tail_recursive_reverse(items, [])
}
```

---

# Gleam para Usuários Python

## Comentários

| Python | Gleam |
|--------|-------|
| `# Comentário` | `// Comentário` |
| `"""Docstring"""` | `/// Documentação de função/tipo` |
| — | `//// Documentação de módulo` |

## Variáveis

Em Python, não há palavra-chave para variáveis. Em Gleam, usa-se `let`:

```gleam
let size = 50
let size = size + 100
let size = 1
```

## Anotações de Tipo em Variáveis

Python usa type hints opcionais verificados por ferramentas externas. Gleam verifica anotações em tempo de compilação:

```gleam
let some_list: List(Int) = [1, 2, 3]
```

## Funções

Em Python usa-se `def` e `return`. Em Gleam usa-se `fn` e o valor da última expressão é retornado:

```gleam
pub fn sum(x, y) {
  x + y
}

let mul = fn(x, y) { x * y }
mul(1, 2)
```

## Exportação de Funções

Em Python, funções são públicas por padrão. Em Gleam, funções são **privadas** por padrão e precisam da palavra-chave `pub`:

```gleam
// Pública
pub fn sum(x, y) {
  x + y
}

// Privada
fn mul(x, y) {
  x * y
}
```

## Operadores

| Operação | Python | Gleam (Int) | Gleam (Float) |
|----------|--------|-------------|---------------|
| Igual | `==` | `==` | `==` |
| Diferente | `!=` | `!=` | `!=` |
| Maior que | `>` | `>` | `>.` |
| Maior ou igual | `>=` | `>=` | `>=.` |
| Menor que | `<` | `<` | `<.` |
| Menor ou igual | `<=` | `<=` | `<=.` |
| E booleano | `and` | `&&` | `&&` |
| Ou booleano | `or` | `\|\|` | `\|\|` |
| Soma | `+` | `+` | `+.` |
| Subtração | `-` | `-` | `-.` |
| Multiplicação | `*` | `*` | `*.` |
| Divisão | `/` | `/` | `/.` |
| Resto | `%` | `%` | — |
| Concatenação | `+` | `<>` | — |
| Pipe | — | `\|>` | `\|>` |

> **Nota importante:** Em Gleam, ambos os lados de um operador devem ser do **mesmo tipo**. Operadores de float terminam com `.`.

## Constantes

Python não tem variáveis constantes nativas. Em Gleam, use `const`:

```gleam
const the_answer = 42

pub fn main() {
  the_answer
}
```

## Tipos de Dados

### Strings

Em Gleam todas as strings são binários codificados em UTF-8:

```gleam
"Hellø, world!"
```

### Tuplas

```gleam
let my_tuple = #("username", "password", 10)
let #(_, password, _) = my_tuple
```

### Listas

Gleam tem o operador `..` para desestruturação de listas. Listas são imutáveis:

```gleam
let list = [2, 3, 4]
let list = [1, ..list]
let [1, second_element, ..] = list
```

### Dicionários

Não há sintaxe literal para dicts em Gleam. Use `dict.from_list`:

```gleam
import gleam/dict

dict.from_list([#("key1", "value1"), #("key2", "value2")])
```

## Controle de Fluxo

### Case vs Match

O `case` de Gleam é similar ao `match` de Python, mas com verificação de exaustividade:

```gleam
case some_number {
  0 -> "Zero"
  1 -> "Um"
  2 -> "Dois"
  n -> "Algum outro número"
}
```

Com desestruturação:

```gleam
case xs {
  [] -> "Lista vazia"
  [a] -> "Lista com 1 elemento"
  [a, b] -> "Lista com 2 elementos"
  _other -> "Lista com mais de 2 elementos"
}
```

### Tratamento de Erros

Python usa exceções (`try/except`). Gleam usa o tipo `Result`:

```gleam
case int.parse("123") {
  Error(e) -> io.println("Não era um Int")
  Ok(i) -> io.println("Parseamos o Int")
}
```

Com `use` para simplificar:

```gleam
use int_a <- result.try(parse_int(a_number))
use int_b <- result.try(parse_int(another_number))
Ok(int_a + int_b)
```

## Tipos Customizados

```gleam
type Person {
  Person(name: String, age: Int)
}

let person = Person(name: "Jake", age: 35)
let name = person.name
```

> **Diferença importante:** Não há OOP em Gleam. Métodos não podem ser adicionados a tipos.

## Uniões

Em Gleam, uniões são modeladas com tipos customizados com múltiplas variantes:

```gleam
type IntOrFloat {
  AnInt(Int)
  AFloat(Float)
}
```

## Módulos e Importações

Cada arquivo é um módulo em Gleam. Importações são relativas à pasta `src`:

```gleam
// Importar módulo
import nasa/rocket_ship

// Importar com alias
import unix/cat as kitty

// Importar itens específicos
import animal/cat.{Cat, stroke}
```

---

# Referência da Linha de Comando

O comando `gleam` usa subcomandos para acessar diferentes funcionalidades:

## `gleam add`

```bash
gleam add [OPTIONS] <PACKAGES>...
```

Adiciona novas dependências ao projeto.

| Opção | Descrição |
|-------|-----------|
| `--dev` | Adiciona os pacotes como dependências apenas de desenvolvimento |

## `gleam build`

```bash
gleam build [OPTIONS]
```

Compila o projeto.

| Opção | Descrição |
|-------|-----------|
| `-t, --target <TARGET>` | A plataforma alvo |
| `--warnings-as-errors` | Trata avisos como erros |

## `gleam check`

```bash
gleam check [OPTIONS]
```

Verifica tipos do projeto.

| Opção | Descrição |
|-------|-----------|
| `-t, --target <TARGET>` | A plataforma alvo |

## `gleam clean`

```bash
gleam clean
```

Limpa artefatos de compilação.

## `gleam deps`

```bash
gleam deps <SUBCOMMAND>
```

Trabalha com pacotes de dependência:

- `gleam deps download` — Baixa todos os pacotes de dependência
- `gleam deps list` — Lista todos os pacotes de dependência
- `gleam deps update` — Atualiza pacotes para suas versões mais recentes

## `gleam dev`

```bash
gleam dev [OPTIONS] [ARGUMENTS]...
```

Executa o ponto de entrada de desenvolvimento do projeto.

| Opção | Descrição |
|-------|-----------|
| `--runtime <RUNTIME>` | Runtime a usar |
| `-t, --target <TARGET>` | Plataforma alvo |

## `gleam docs`

- `gleam docs build [--open]` — Renderiza docs HTML localmente
- `gleam docs publish` — Publica docs HTML no HexDocs
- `gleam docs remove --package <PKG> --version <VER>` — Remove docs do HexDocs

## `gleam export`

- `gleam export erlang-shipment` — Erlang pré-compilado, pronto para deploy
- `gleam export hex-tarball` — Pacote em tarball para publicar no Hex
- `gleam export javascript-prelude` — Módulo prelude JavaScript
- `gleam export package-interface --out <OUTPUT>` — Info de módulos/funções/tipos em JSON
- `gleam export typescript-prelude` — Módulo prelude TypeScript

## `gleam fix`

```bash
gleam fix
```

Reescreve código Gleam depreciado.

## `gleam format`

```bash
gleam format [OPTIONS] [FILES]...
```

Formata código fonte.

| Opção | Descrição |
|-------|-----------|
| `--check` | Verifica se inputs estão formatados sem alterá-los |
| `--stdin` | Lê fonte do STDIN |

## `gleam hex`

- `gleam hex retire <PACKAGE> <VERSION> <REASON> [MESSAGE]` — Retira uma release do Hex
- `gleam hex unretire <PACKAGE> <VERSION>` — Des-retira uma release do Hex

## `gleam lsp`

```bash
gleam lsp
```

Executa o language server, para uso por editores.

## `gleam new`

```bash
gleam new [OPTIONS] <PROJECT_ROOT>
```

Cria um novo projeto.

| Opção | Descrição |
|-------|-----------|
| `--name <NAME>` | Nome do projeto |
| `--skip-git` | Pula inicialização do git |
| `--skip-github` | Pula criação de arquivos `.github/*` |
| `--template <TEMPLATE>` | Template (padrão: `erlang`, possíveis: `erlang`, `javascript`) |

## `gleam publish`

```bash
gleam publish [OPTIONS]
```

Publica o projeto no gerenciador de pacotes Hex.

## `gleam remove`

```bash
gleam remove <PACKAGES>...
```

Remove dependências do projeto.

## `gleam run`

```bash
gleam run [OPTIONS] [ARGUMENTS]...
```

Executa o projeto.

| Opção | Descrição |
|-------|-----------|
| `-m, --module <MODULE>` | O módulo a executar |
| `--runtime <RUNTIME>` | Runtime a usar |
| `-t, --target <TARGET>` | Plataforma alvo |

## `gleam shell`

```bash
gleam shell
```

Inicia um shell Erlang.

## `gleam test`

```bash
gleam test [OPTIONS] [ARGUMENTS]...
```

Executa os testes do projeto.

| Opção | Descrição |
|-------|-----------|
| `--runtime <RUNTIME>` | Runtime a usar |
| `-t, --target <TARGET>` | Plataforma alvo |

## `gleam update`

```bash
gleam update
```

Atualiza pacotes de dependência para suas versões mais recentes.

---

# Configuração do Projeto (gleam.toml)

Todos os projetos Gleam requerem um arquivo de configuração `gleam.toml`. O formato de configuração `toml` é documentado em [toml.io](https://toml.io).

## Campos Principais

```toml
# Nome do projeto (obrigatório)
name = "my_project"

# Versão do projeto (obrigatório)
version = "1.0.0"

# Licenças em formato SPDX (opcional)
licences = ["Apache-2.0", "MIT"]

# Descrição curta (opcional)
description = "Bindings Gleam para..."

# Alvo padrão: "erlang" ou "javascript" (padrão: "erlang")
target = "erlang"

# Repositório do código fonte (opcional)
repository = { type = "github", user = "example", repo = "my_project" }

# Links para sites relacionados (opcional)
links = [
  { title = "Página inicial", href = "https://example.com" },
]

# Módulos internos (não incluídos na documentação gerada)
internal_modules = [
  "my_app/internal",
  "my_app/internal/*",
]

# Versão mínima do compilador Gleam (opcional)
gleam = ">= 0.30.0"
```

## Dependências

```toml
[dependencies]
gleam_stdlib = ">= 0.18.0 and < 2.0.0"
gleam_erlang = ">= 0.2.0 and < 2.0.0"

# Dependências locais
my_other_project = { path = "../my_other_project" }

# Dependências Git
my_library = { git = "git@github.com:my-project/my-library.git", ref = "a8b3c5d82" }

[dev-dependencies]
gleeunit = ">= 1.0.0 and < 2.0.0"
```

## Documentação

```toml
[documentation]
pages = [
  { title = "Minha Página", path = "my-page.html", source = "./path/to/my-page.md" },
]
```

## Configuração Erlang

```toml
[erlang]
# Módulo de aplicação OTP (opcional)
application_start_module = "my_application"

# Aplicações OTP extras
extra_applications = ["inets", "ssl"]
```

## Configuração JavaScript

```toml
[javascript]
# Gerar arquivos TypeScript .d.ts
typescript_declarations = true

# Runtime JavaScript: "node", "deno" ou "bun"
runtime = "node"
```

### Configuração Deno

```toml
[javascript.deno]
allow_all = false
allow_sys = false
allow_ffi = false
allow_hrtime = false
allow_env = ["DATABASE_URL"]
allow_net = ["example.com:443"]
allow_run = ["./bin/migrate.sh"]
allow_read = ["./database.sqlite"]
allow_write = ["./database.sqlite"]
```

---

# O Language Server Gleam

O Language Server Gleam é um programa que fornece recursos de IDE para editores de texto que implementam o protocolo de Language Server (LSP), como VS Code e Neovim.

## Instalação

O Language Server está incluído no binário `gleam` regular. Se você tem Gleam instalado, já tem o language server.

### Editores Suportados

- **Gram** — suporte nativo, sem configuração adicional
- **Helix** — suporte nativo, sem configuração adicional
- **Neovim** — via `nvim-lspconfig`:
  - Nvim 0.11+: `vim.lsp.enable('gleam')`
  - Nvim <= 0.10: `require('lspconfig').gleam.setup({})`
- **VS Code** — instale o plugin Gleam para VS Code
- **Zed** — ao abrir um arquivo Gleam, Zed sugerirá instalar o plugin
- **Outros** — configure o editor para executar `gleam lsp` na raiz do workspace

## Funcionalidades

### Suporte a Múltiplos Projetos

Você pode abrir arquivos Gleam de múltiplos projetos em uma sessão de editor.

### Compilação do Projeto

O language server compila automaticamente o código dos projetos abertos. Arquivos editados mas não salvos são usados na compilação.

### Diagnósticos de Erro e Aviso

Erros e avisos encontrados na compilação aparecem como diagnósticos no editor.

### Formatação de Código

O language server pode formatar código Gleam usando o formatador Gleam.

### Hover

Mostra documentação, tipos e outras informações ao passar o mouse sobre constantes, imports, funções, padrões, campos de record, anotações de tipo e valores.

### Go-to Definition

Suporta navegação para definições de constantes, funções, imports, anotações de tipo e variáveis.

### Go-to Type Definition

Identifica os tipos de valores em uma expressão e apresenta suas definições.

### Find References

Encontra referências para funções, argumentos de função, constantes, tipos, variantes de tipos customizados e variáveis.

### Code Completion

Completa argumentos de função, funções/constantes de outros módulos (adicionando imports automaticamente), variáveis locais, módulos em imports, campos de record, construtores de tipo e mais.

### Rename

Renomeia funções, argumentos, constantes, tipos, variantes e variáveis.

### Document Symbols

Lista símbolos do documento (funções, constantes, etc.).

### Signature Help

Mostra o tipo de cada argumento ao chamar uma função.

## Code Actions (Ações de Código)

O language server oferece diversas ações de código:

- **Add annotations** — adiciona anotações de tipo a atribuições e funções
- **Add missing import** — adiciona imports faltantes
- **Add missing patterns** — adiciona padrões faltantes a case inexaustivo
- **Add omitted labels** — adiciona rótulos omitidos a chamadas
- **Case correction** — corrige nomes escritos com case errado
- **Collapse nested case** — mescla expressões case aninhadas
- **Convert to/from pipe** — converte entre sintaxe `|>` e chamada regular
- **Convert to/from use** — converte entre sintaxe `use` e chamada regular
- **Discard unused result** — atribui resultados não usados a `_`
- **Expand function capture** — converte captura de função para função anônima
- **Extract constant** — extrai expressão para constante
- **Extract variable** — extrai expressão para variável
- **Fill labels** — adiciona rótulos esperados a uma chamada
- **Fill unused fields** — adiciona campos não correspondidos em padrão
- **Generate decoder** — gera decodificador dinâmico a partir de tipo customizado
- **Generate function** — gera definição de função local não existente
- **Generate to-JSON function** — gera função para converter tipo em JSON
- **Inexhaustive let to case** — converte let inexaustivo para case
- **Inline variable** — inline uma variável usada apenas uma vez
- **Interpolate string** — divide string para interpolar um valor
- **Pattern match** — gera expressão case exaustiva
- **Qualify/Unqualify** — adiciona ou remove qualificadores de módulo
- **Remove block** — remove blocos ao redor de expressões únicas
- **Remove echo** — remove expressões echo de debug
- **Remove opaque from private type** — remove `opaque` redundante
- **Remove redundant tuples** — remove tuplas redundantes de case
- **Remove unreachable clauses** — remove cláusulas inalcançáveis de case
- **Remove unused imports** — remove imports não utilizados
- **Use label shorthand** — atualiza para sintaxe abreviada de rótulos
- **Wrap in block** — envolve valor em um bloco

## Segurança

O language server não realiza geração de código nem compila Erlang/Elixir, então não há chance de execução de código ao abrir um arquivo.

---

# Criando um Software Bill of Materials (SBoM)

## O que é um SBoM?

Um **Software Bill of Materials (SBoM)** é um inventário estruturado dos componentes que compõem um sistema de software. Tipicamente inclui: dependências diretas e transitivas, nomes e versões de pacotes, localizações de origem, hashes criptográficos, informações de licença e copyright.

Os dois formatos mais usados são **CycloneDX** e **SPDX**.

## Por que gerar um SBoM?

- **Análise de vulnerabilidades** — ferramentas de segurança podem determinar se um projeto é afetado por vulnerabilidades conhecidas
- **Requisitos regulatórios** — cada vez mais exigidos em ambientes regulados
- **Conformidade de licenças** — revisar licenças usadas por dependências

## O que é o OSS Review Toolkit?

O **OSS Review Toolkit (ORT)** é um toolkit open source para analisar dependências, licenças e outros aspectos da cadeia de suprimentos de software.

## Gerando um SBoM usando Docker

### 1. Análise de Dependências

```bash
docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  ghcr.io/oss-review-toolkit/ort-minimal:74.0.0 \
  analyze \
  --input-dir /workspace \
  --output-dir /workspace/ort-result
```

### 2. Scanning

```bash
docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  ghcr.io/oss-review-toolkit/ort-minimal:74.0.0 \
  scan \
  --input-file /workspace/ort-result/analyzer-result.yml \
  --output-dir /workspace/ort-result
```

### 3. Geração de Relatório

```bash
docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  ghcr.io/oss-review-toolkit/ort-minimal:74.0.0 \
  report \
  --input-file /workspace/ort-result/scan-result.yml \
  --output-dir /workspace/ort-result \
  --report-formats CycloneDx,SpdxDocument,WebApp \
  --option CycloneDX=output.file.formats=json,xml \
  --option SpdxDocument=outputFileFormats=JSON,YAML
```

## Gerando com GitHub Actions

```yaml
name: Generate SBoM
on:
  push:
    branches: [main]

jobs:
  ort:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6.0.1
      - name: Run OSS Review Toolkit
        id: ort
        uses: oss-review-toolkit/ort-ci-github-action@v1.1.0
        with:
          image: "ghcr.io/oss-review-toolkit/ort-minimal:74.0.0"
          run: >-
            labels,
            cache-dependencies,
            cache-scan-results,
            analyzer,
            scanner,
            advisor,
            evaluator,
            reporter,
            upload-results
          report-formats: "CycloneDx,SpdxDocument,WebApp"
          ort-cli-report-args: >-
            -O CycloneDX=output.file.formats=json,xml
            -O SpdxDocument=outputFileFormats=JSON,YAML
```

## Próximos Passos

Uma vez que você tenha um SBoM, pode: enviar para ferramentas de análise de vulnerabilidades, compartilhar com clientes ou auditores, e usar como parte de processos de conformidade internos.

SBoMs são mais eficazes quando gerados automaticamente e mantidos atualizados. Integrar ORT em CI garante que o inventário reflita o estado atual do projeto.