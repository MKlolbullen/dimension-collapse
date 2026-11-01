# Projecting $\mathbb{R}^n \to \mathbb{R}^3$

Three.js draws in $\mathbb{R}^3$ (and then its own camera projects to the 2D
screen). Everything above three dimensions has to be flattened first.

## Orthographic: the shadow

Drop the extra coordinates:

$$
P_{\perp}(x_0, \dots, x_{n-1}) = (x_0, x_1, x_2).
$$

This is the shadow cast by parallel light shining along the extra axes. For a
tesseract it produces two cubes drawn _on top of each other_: honest, but you
cannot see that there are two. Available in the UI as "orthographic".

## Perspective: one division per extra dimension

In ordinary 3D perspective an eye at distance $d$ on the $+z$ axis maps
$(x, y, z) \mapsto \dfrac{d}{d - z}\,(x, y)$: things nearer the eye (larger
$z$) look bigger. Repeat that idea once for every extra axis. For the
tesseract, the eye sits at distance $d$ along $+w$:

$$
P_4(x, y, z, w) = \frac{d}{d - w}\,(x, y, z).
$$

The $w = +1$ cube is scaled by $\frac{d}{d-1}$ and the $w = -1$ cube by
$\frac{d}{d+1}$; with the app's default $d = 4$ that is $1.33$ and $0.8$,
the classic "small cube inside a big cube" wireframe. Rotating in the $xw$
plane moves vertices between the two cubes and makes the inner cube turn
inside-out — the canonical 4D demo.

For $n > 4$ apply one factor per dropped axis. The app computes the factors
from the **original** coordinates and multiplies them, with its own eye
distance $d_k$ for each axis:

$$
P_n(x) = \Bigl(\prod_{k=3}^{n-1} \frac{d_k}{d_k - x_k}\Bigr)\,(x_0, x_1, x_2),
\qquad d_k = d + s\,(k - 3),
$$

with $d = 4$ and spread $s = 0.5$ by default ($d_w = 4,\ d_v = 4.5,\ d_u = 5,\ d_t = 5.5$).

### Why the product form (and not a literal chain)

The literal chain — divide by $(d - x_{n-1})$, then by $(d - x'_{n-2})$ using
the *already scaled* $x'_{n-2}$, and so on — is the same thing up to how the
eye distance is chosen at each step. If at step $k$ the eye is placed at
$d_k \cdot F_k$, where $F_k$ is the factor accumulated so far, then

$$
\frac{d_k F_k}{d_k F_k - F_k x_k} = \frac{d_k}{d_k - x_k},
$$

exactly the product form. The product form has a practical advantage: it is
finite as long as $|x_k| < d_k$ for every axis. A rotated 7-cube corner has
norm $\sqrt 7 \approx 2.65$, so no coordinate can reach the eye at $d \ge 4$,
whereas a fixed-distance chain lets scaled coordinates grow until a vertex
sits _on_ the eye and the picture explodes. (`tests/projection.test.js`
checks both the equivalence and the finiteness.)

### Why a different distance per axis

With one shared distance the product $\prod_k \frac{d}{d - x_k}$ over
$x_k \in \{\pm 1\}$ depends only on _how many_ of the extra coordinates are
$+1$, not which. Vertices of the 7-cube that agree in $(x, y, z)$ and have the
same count of $+1$s among $(w, v, u, t)$ would land on the same point:
$8 \times 5 = 40$ distinct images for 128 vertices, and 448 edges piling onto a
few dozen segments. Distinct $d_k$ make the products distinct, so every
vertex gets its own image (tested for $n = 4 \dots 7$). The increasing
distances also soften the compounded magnification of the highest axes.

### What the picture means

A perspective projection is a **central projection**: all points on a ray
from the eye land on the same image point. Information along the dropped
axis is lost — that is unavoidable, a map $\mathbb{R}^4 \to \mathbb{R}^3$
cannot be injective — but it is lost _in a structured way_: nearer things are
bigger. Rotation puts the lost information back one slice at a time, which is
why rotating a projection is more informative than any still image.

## Then Three.js

After $P_n$ the vertices are ordinary 3D points. A `PerspectiveCamera` with
orbit controls does the last step $\mathbb{R}^3 \to \mathbb{R}^2$; dragging
rotates that camera, which never touches $w$. The two projections compose:
the screen shows $P_{\text{camera}}(P_n(R\,x))$.
