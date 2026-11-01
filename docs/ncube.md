# The n-cube

## Definition

The $n$-cube (hypercube) used throughout is

$$
Q_n = [-1, 1]^n = \{ (x_0, \dots, x_{n-1}) : x_k \in [-1, 1] \}.
$$

Its **vertices** are the points with every coordinate equal to $\pm 1$:

$$
V(Q_n) = \{-1, +1\}^n, \qquad |V(Q_n)| = 2^n .
$$

Two vertices are joined by an **edge** when they differ in exactly one
coordinate. Pick the coordinate ($n$ ways) and the other $n-1$ coordinates
freely ($2^{n-1}$ ways):

$$
|E(Q_n)| = n \cdot 2^{n-1}.
$$

| $n$ | name      | vertices $2^n$ | edges $n\,2^{n-1}$ |
| --- | --------- | -------------- | ------------------ |
| 0   | point     | 1              | 0                  |
| 1   | segment   | 2              | 1                  |
| 2   | square    | 4              | 4                  |
| 3   | cube      | 8              | 12                 |
| 4   | tesseract | 16             | 32                 |
| 5   | penteract | 32             | 80                 |
| 6   | hexeract  | 64             | 192                |
| 7   | hepteract | 128            | 448                |

In code (`ncube(n)`), vertex $i \in \{0, \dots, 2^n - 1\}$ has coordinate
$x_k = +1$ if bit $k$ of $i$ is set, else $-1$. An edge is a pair $(i,\; i \lor 2^k)$ for
each unset bit $k$ of $i$; that bit is the **axis** the edge runs along. Every
axis carries exactly $2^{n-1}$ edges.

## The recursion the animation acts out

$Q_n$ is two copies of $Q_{n-1}$ — one at $x_{n-1} = -1$, one at
$x_{n-1} = +1$ — plus one new edge joining each vertex of the first copy to the
same vertex of the second:

$$
V(Q_n) = V(Q_{n-1}) \times \{-1\} \;\cup\; V(Q_{n-1}) \times \{+1\},
$$

$$
|E(Q_n)| = 2\,|E(Q_{n-1})| + |V(Q_{n-1})| = 2\,|E(Q_{n-1})| + 2^{n-1},
$$

which, with $|E(Q_0)| = 0$, solves to $n\,2^{n-1}$. `ncubeRecursive(n)`
implements exactly this and the test-suite checks that it produces the same
vertex order and edge set as the closed form.

## "Corner placement": why it reads as fractal

There are two ways to tell this story.

**Extrusion.** Take the $(n-1)$-cube and drag it along a new direction. Its
sweep is the $n$-cube. This is correct and is what the geometry literally does,
but it reads as _one_ object being stretched — a cube-inside-a-cube.

**Corner placement.** At _every_ corner of the $(n-1)$-cube, attach a new
unit vector pointing in the new direction $e_{n-1}$. The tips of these vectors
are the corners of the second copy. Connect tips that were connected before.
The rule is the same at every corner and at every scale; nothing about it
refers to how many dimensions already exist. Applying "the same rule, one
more layer" $n$ times from a point is a fractal-style construction, and the
number of corners doubles each time precisely because every existing corner
spawns one new one.

The animation uses the second framing: during a build step the second copy
starts _coincident_ with the first (extent 0) and the connecting edges have
zero length, then the copy slides out along the new axis while the connecting
edges grow and glow. During a collapse the same thing runs backwards.

## Where the vertices live when the axis is only partly there

Between steps the frontier axis $k$ has an **extent** $s \in [0, 1]$ and the
displayed object is

$$
\{(x_0, \dots, x_{k-1},\; s\,x_k) : x \in V(Q_{k+1})\},
$$

i.e. the $(k+1)$-cube with its last coordinate scaled by $s$. At $s = 1$ it
is $Q_{k+1}$. At $s = 0$ the two copies coincide exactly and the picture is
indistinguishable from $Q_k$ — so the discrete **snap** between "we have the
basis vector $e_k$" and "we don't" happens at a moment where nothing visible
changes. That is deliberate; see [collapse.md](collapse.md).
