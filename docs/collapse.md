# The collapse as a dimensional projection

## What a collapse step is

Collapsing from $n$ to $n-1$ dimensions is the orthogonal projection onto the
hyperplane $x_{n-1} = 0$:

$$
\pi_{n-1} : \mathbb{R}^n \to \mathbb{R}^{n-1}, \qquad
\pi_{n-1}(x_0, \dots, x_{n-1}) = (x_0, \dots, x_{n-2}).
$$

Its kernel is the line spanned by $e_{n-1}$: every pair of points that differ
only in their last coordinate lands on the same point. For the cube that is
the two-copies recursion read backwards — the $2^{n-1}$ connecting edges
shrink to length zero, the two copies of $Q_{n-1}$ coincide, and each of
the $2^{n-1}$ pairs of twin vertices merges into one:

$$
\pi_{n-1}(Q_n) = Q_{n-1}, \qquad 2^n \text{ vertices} \to 2^{n-1}.
$$

The animation realises this with a one-parameter family of **scalings**,

$$
S_s = \operatorname{diag}(1, \dots, 1, s), \qquad s : 1 \to 0,
$$

so the visible object at time $s$ is $S_s(Q_n)$ and $S_0 = \pi_{n-1}$ (as a
map into the hyperplane). Build-up is the same family run the other way,
$s : 0 \to 1$. Between them the shown vertex set is still $2^n$ points — the
extent is a _display_ parameter — until the snap at $s = 0$, at which point
the model genuinely switches to $Q_{n-1}$.

Why these are legitimate projections rather than cosmetic squashing: the
whole 7-step collapse composes to

$$
\pi_0 \circ \pi_1 \circ \cdots \circ \pi_6 : \mathbb{R}^7 \to \mathbb{R}^0,
$$

the zero map, and the animation ends on exactly one point: the image of all
128 vertices.

## Why discrete steps

You either have a basis vector or you don't. A vector space of dimension
$3.5$ does not exist; what exists is $\mathbb{R}^3$, then $\mathbb{R}^4$,
with nothing in between. A smooth drift from cube to tesseract would suggest
that dimensions grow like a volume knob. The animation keeps the _count_
discrete (the dimension pips, the stage labels, the vertex/edge counts all
snap) while letting the _picture_ move smoothly inside each step. The snap
is placed at extent $0$, where the two copies coincide, so it costs nothing
visually — but it is the moment where the model's $n$ changes, and the HUD
says so.

This matches how the linear-algebra view is actually used: a basis is a
_set_; you add a vector to it or remove one. Everything continuous — rotation,
scaling, projection — is a matrix acting on a space whose dimension is
already decided.

## What the extra channels encode

Beyond three spatial axes the screen has to borrow non-spatial channels.
Each one is a function of a single coordinate in the object's own frame
(before rotation), so rotating the object visibly _moves colour around_ —
which is the information a 3D projection throws away.

| Axis      | Index | Channel          | Mapping                                                                            |
| --------- | ----- | ---------------- | ---------------------------------------------------------------------------------- |
| $x, y, z$ | 0–2   | position         | via $P_n$ and the Three.js camera                                                  |
| $w$       | 3     | hue              | $h = 0.50 + 0.29\,(w + 1)$, teal $\to$ violet $\to$ amber                          |
| $v$       | 4     | brightness       | $b = 1 - 0.35\,(s_v - v)$: the $+v$ half stays bright                              |
| $u, t$    | 5, 6  | perspective only | $\frac{d}{d - u}$, $\frac{d}{d - t}$ factors, plus timeline spins in $zu$ and $wt$ |

Below 4D, hue is attached to the **frontier axis** — the one currently being
built or collapsed. Because the hue parameter is the _scaled_ coordinate
$s\,x_k$, colour drains out of the picture as the axis collapses: when the
dimension is gone there is nothing left to colour. (During a build the hue
cross-fades from the previous axis over the first third of the step so the
switch is not a flash.)

$s_v$ above is the extent of axis $v$, so brightness is continuous through
the 4D $\to$ 5D snap; at full extent the $-v$ half sits at $0.3$.

Opacity-as-dimension from the original design list is implemented as this
brightness fade: on a pure black background multiplying the colour by $b$ is
indistinguishable from drawing with alpha $b$, and it avoids per-vertex alpha
in the line shader.

## The honest endpoint

By 5D the picture is a _code_: position for three coordinates, colour for one,
brightness for one, nested perspective for the rest. By 7D the only thing that
still scales is the matrix. Every vertex of $Q_7$ is a 7-bit string of
$\pm 1$; an edge flips one bit; a rotation is a $7 \times 7$ orthogonal matrix
with $\binom 7 2 = 21$ planes to turn in. The pictures run out, the algebra does
not — and the point of repeating the collapse is to make that hand-off feel
earned rather than like giving up.
