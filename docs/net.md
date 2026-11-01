# The tesseract net

## Cells

A cube has 6 square faces; a tesseract has 8 **cubic cells**, one for each
facet $x_k = \pm 1$, $k \in \{x, y, z, w\}$. Each cell is a copy of $Q_3$
sitting in a 3-dimensional hyperplane of $\mathbb{R}^4$. Every tesseract
vertex belongs to 4 cells (one per coordinate), every edge to 3 cells, every
square face to 2.

Just as a cube can be cut along some edges and unfolded into a flat net of six
squares (a cross, a T, a zig-zag — there are 11 nets), a tesseract can be cut
along some square faces and unfolded into a **3-dimensional** net of eight
cubes. There are 261 of them. The one everybody knows is the cross (the one
in Dalí's _Corpus Hypercubus_), and it is the one the app uses.

## Construction (flat)

Work in the hyperplane $w = -1$, which is just a copy of $\mathbb{R}^3$. The
flat net is eight unit cubes (side 2, to match $[-1,1]^3$), each identified by
the facet it will become:

| cell      | facet       | centre in the net |
| --------- | ----------- | ----------------- |
| core      | $w = -1$    | $(0, 0, 0)$       |
| $x^{\pm}$ | $x = \pm 1$ | $(\pm 2, 0, 0)$   |
| $y^{\pm}$ | $y = \pm 1$ | $(0, \pm 2, 0)$   |
| $z^{\pm}$ | $z = \pm 1$ | $(0, 0, \pm 2)$   |
| far       | $w = +1$    | $(0, -4, 0)$      |

Six cubes share a face with the core; the eighth hangs off the far face of
$y^{-}$. (Which arm carries the eighth cube is a convention — any of the six
works and gives the same folded tesseract.)

## Folding

A cube attached to the core across the face with outward unit direction
$\mathbf d \in \{\pm e_x, \pm e_y, \pm e_z\}$ is hinged on that face. Folding
it "up" means rotating it about the hinge in the plane spanned by
$\mathbf d$ and $e_w$ — a plane you cannot see from inside the hyperplane
$w = -1$, which is exactly why the unfolding is the hero moment.

For a point $p$, hinge point $h$ (any point of the hinge face), relative
vector $r = p - h$, let $a = r \cdot \mathbf d$ and $b = r \cdot e_w$ be its
components in the fold plane. The fold by angle $\theta$ is

$$
\begin{pmatrix} a' \\ b' \end{pmatrix}
=
\begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix}
\begin{pmatrix} a \\ b \end{pmatrix},
\qquad
p' = h + \bigl(r - a\,\mathbf d - b\,e_w\bigr) + a'\,\mathbf d + b'\,e_w ,
$$

i.e. a Givens rotation (see [rotation.md](rotation.md)) in the plane
$(\mathbf d, e_w)$ centred on the hinge. The components of $r$ orthogonal to
the fold plane are untouched, so the hinge face stays put and the cube stays
rigid (`tests/net.test.js` checks every edge keeps length 2 at every fold
angle).

At $\theta = \pi/2$ the offset $a \in [0, 2]$ along $\mathbf d$ becomes an
offset along $+w$: a cube that lay at $x \in [1, 3]$, $w = -1$ now stands at
$x = 1$, $w \in [-1, 1]$ — precisely the facet $x = +1$ of $[-1,1]^4$.

### The eighth cube folds twice

The far cube is attached to $y^-$, not to the core, so it inherits the fold of
$y^-$. Its folds are applied innermost first:

1. about the hinge $y = -3$ (its face shared with $y^-$), in the plane
   $(-e_y, e_w)$, by $\theta$;
2. about the hinge $y = -1$ (the face $y^-$ shares with the core), in the same
   plane, by $\theta$.

At $\theta = \pi/2$: step 1 stands it up at $y = -3$, $w \in [-1, 1]$; step 2
rotates that whole arm a further quarter turn, landing it at
$y \in [-1, 1]$, $w = +1$ — the facet $w = +1$, closing the lid of the box.

## Checks

The folded net is _exactly_ the tesseract: the union of the eight cells'
vertices is the 16 points $\{\pm 1\}^4$ and the union of their edges (each
counted once) is the tesseract's 32 edges. Vertex and edge counts of the net
itself are $8 \times 8 = 64$ and $8 \times 12 = 96$, because shared corners
and edges are drawn once per cube so the cubes can separate while folding.

## In the animation

`fold` runs $1 \to 0$ (tesseract $\to$ flat cross) and back, while the net
replaces the cube wireframe through a short cross-fade; at `fold = 1` the two
coincide so the swap is invisible. Colour is the $w$ coordinate: flat, all
eight cubes share $w = -1$ and are the same teal; as they fold, the standing
cubes span the whole hue range and the lid turns amber. The whole thing is then
projected $\mathbb{R}^4 \to \mathbb{R}^3$ exactly like the tesseract
([projection.md](projection.md)), so the standing cubes lean under perspective
as they rise.
