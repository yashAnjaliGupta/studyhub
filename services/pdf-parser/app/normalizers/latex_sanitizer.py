import re
import unicodedata

class LatexSanitizer:
    """
    Sanitizes raw extracted text and mathematical expressions
    to produce clean, standards-compliant KaTeX LaTeX notation.
    Preserves bolding, sub/superscripts, vectors, Greek symbols, and formulas.
    """

    GREEK_MAP = {
        'α': r'\alpha', 'β': r'\beta', 'γ': r'\gamma', 'δ': r'\delta',
        'ε': r'\epsilon', 'θ': r'\theta', 'λ': r'\lambda', 'μ': r'\mu',
        'ν': r'\nu', 'ξ': r'\xi', 'π': r'\pi', 'ρ': r'\rho',
        'σ': r'\sigma', 'τ': r'\tau', 'υ': r'\upsilon', 'φ': r'\phi',
        'χ': r'\chi', 'ψ': r'\psi', 'ω': r'\omega',
        'Γ': r'\Gamma', 'Δ': r'\Delta', '∆': r'\Delta', 'Θ': r'\Theta',
        'Λ': r'\Lambda', 'Ξ': r'\Xi', 'Π': r'\Pi', 'Σ': r'\Sigma',
        'Υ': r'\Upsilon', 'Φ': r'\Phi', 'Ψ': r'\Psi', 'Ω': r'\Omega'
    }

    UNICODE_SUBS = {
        '₀': '_0', '₁': '_1', '₂': '_2', '₃': '_3', '₄': '_4',
        '₅': '_5', '₆': '_6', '₇': '_7', '₈': '_8', '₉': '_9',
        '₊': '_+', '₋': '_-', '₌': '_=', '₍': '_(', '₎': '_)',
        'ₐ': '_a', 'ₑ': '_e', 'ₒ': '_o', 'ₓ': '_x', 'ₕ': '_h',
        'ₖ': '_k', 'ₗ': '_l', 'ₘ': '_m', 'ₙ': '_n', 'ₚ': '_p',
        'ₛ': '_s', 'ₜ': '_t'
    }

    UNICODE_SUPS = {
        '⁰': '^0', '¹': '^1', '²': '^2', '³': '^3', '⁴': '^4',
        '⁵': '^5', '⁶': '^6', '⁷': '^7', '⁸': '^8', '⁹': '^9',
        '⁺': '^+', '⁻': '^-', '⁼': '^=', '⁽': '^(', '⁾': '^)',
        'ⁿ': '^n', 'ⁱ': '^i'
    }

    OPERATOR_MAP = {
        "\u2212": "-",       # Minus sign
        "\u2013": "-",       # En dash
        "\u2014": "--",      # Em dash
        "\u2018": "'",       # Left single quote
        "\u2019": "'",       # Right single quote
        "\u201c": '"',       # Left double quote
        "\u201d": '"',       # Right double quote
        "\u00b0": r"^\circ", # Degree symbol
        "\u2264": r"\le",    # <=
        "\u2265": r"\ge",    # >=
        "\u2260": r"\ne",    # !=
        "\u2248": r"\approx",# Approx
        "\u00d7": r"\times", # Times
        "\u00f7": r"\div",   # Div
        "\u00b1": r"\pm",    # Plus-minus
        "\u2213": r"\mp",    # Minus-plus
        "\u221e": r"\infty", # Infinity
        "\u2192": r"\rightarrow", # Right arrow
        "\u2190": r"\leftarrow",  # Left arrow
        "\u21d2": r"\Rightarrow", # Double right arrow
        "\u2202": r"\partial",    # Partial
        "\u2207": r"\nabla",      # Del/nabla
        "\u222b": r"\int",        # Integral
        "\u2211": r"\sum",        # Sum
    }

    @classmethod
    def sanitize(cls, text: str) -> str:
        if not text:
            return ""

        # Step 1: Normalize Mathematical Alphanumeric Symbols (𝑊 -> W, 𝐿 -> L, etc.)
        # NFKD decomposes mathematical italic, bold, sans-serif into standard Latin + combining marks
        cleaned = unicodedata.normalize('NFKD', text)

        # Step 2: Handle vector combining arrows (e.g. S\u20d7 -> \vec{S})
        cleaned = re.sub(r'([A-Za-z0-9])\u20d7+', r'\\vec{\1}', cleaned)

        # Step 3: Replace Unicode sub/superscripts
        for k, v in cls.UNICODE_SUBS.items():
            cleaned = cleaned.replace(k, v)
        for k, v in cls.UNICODE_SUPS.items():
            cleaned = cleaned.replace(k, v)

        # Step 4: Replace Operators and Math Punctuation
        for orig, rep in cls.OPERATOR_MAP.items():
            cleaned = cleaned.replace(orig, rep)

        # Step 5: Replace Greek Characters
        for orig, rep in cls.GREEK_MAP.items():
            # Add spaces around LaTeX macros to avoid fusing with adjacent letters
            cleaned = cleaned.replace(orig, f" {rep} ")

        # Strip unrenderable private-use area characters
        cleaned = re.sub(r'[\ue000-\uf8ff]', '', cleaned)

        # Step 6: Fix unescaped backslashes in math commands (exclude common English words like 'left', 'right', 'to', 'text')
        math_commands = [
            "frac", "sqrt", "int", "sum", "prod", "lim", "infty",
            "alpha", "beta", "gamma", "delta", "epsilon", "theta", "lambda",
            "mu", "nu", "xi", "pi", "rho", "sigma", "tau", "upsilon", "phi",
            "chi", "psi", "omega", "Gamma", "Delta", "Theta", "Lambda", "Xi",
            "Pi", "Sigma", "Upsilon", "Phi", "Psi", "Omega", "sin", "cos",
            "tan", "cot", "sec", "csc", "log", "ln", "exp",
            "times", "div", "pm", "mp", "le", "ge", "ne", "approx", "cdot",
            "vec", "hat", "bar", "mathrm", "mathbf", "circ", "rightarrow"
        ]
        cmd_pattern = r'(?<!\\)\b(' + '|'.join(math_commands) + r')\b'
        cleaned = re.sub(cmd_pattern, r'\\\1', cleaned)

        # Step 7: Clean up multiple spaces and subscripts/superscripts syntax
        # e.g. "M _{ N }" -> "M_{N}", "10 ^ {-3}" -> "10^{-3}"
        cleaned = re.sub(r'\s*([_\^])\s*\{([^}]+)\}', r'\1{\2}', cleaned)
        cleaned = re.sub(r'\s*([_\^])\s*([0-9a-zA-Z])\b', r'\1\2', cleaned)

        # Step 8: Ensure mathematical equations and variables are wrapped in $...$
        cleaned = cls._wrap_equations_in_math_mode(cleaned)

        # Step 9: Normalize whitespace
        cleaned = re.sub(r'[ \t]+', ' ', cleaned)
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)

        return cleaned.strip()

    @classmethod
    def _wrap_equations_in_math_mode(cls, text: str) -> str:
        """
        Carefully wraps isolated mathematical expressions, formulas, and variables
        in KaTeX $...$ delimiters if not already enclosed in math mode ($ or $$).
        """
        # If text already contains complete math blocks, process segments outside $...$
        segments = re.split(r'(\${1,2}[^$]+\${1,2})', text)
        result_parts = []

        for seg in segments:
            if not seg:
                continue
            # Already math mode: leave untouched
            if seg.startswith('$') and seg.endswith('$'):
                result_parts.append(seg)
                continue

            part = seg
            # 1. Equations with equals/inequality signs: e.g. "\alpha = 0.5", "\theta = 60^\circ", "u = 0.8v", "E_P + E_Q = c^2\delta"
            eq_pattern = re.compile(
                r'(?<!\$)(?<!\\)(\\?[A-Za-z0-9_\^\{\}\(\)]+(?:\s*[\+\-\*\/]\s*[\\A-Za-z0-9_\^\{\}\(\)]+)*)\s*(?:[=><]|\\le|\\ge|\\ne|\\approx)\s*([\\A-Za-z0-9_\^\{\}\(\)\.\-]+(?:\s*[\+\-\*\/]\s*[\\A-Za-z0-9_\^\{\}\(\)\.\-]+)*)(?!\$)'
            )
            part = eq_pattern.sub(r'$\1 = \2$', part)

            # 2. Fractions and square roots: \frac{a}{b}, \sqrt{x}
            frac_pattern = re.compile(r'(?<!\$)((\\frac\{[^{}]+\}\{[^{}]+\}|\\sqrt\{[^{}]+\}))(?!\$)')
            part = frac_pattern.sub(r'$\1$', part)

            # 3. Vectors and sub/superscripts: \vec{S}, M_{N}, 10^{-3}, 2\sqrt{2}W
            var_pattern = re.compile(
                r'(?<!\$)\b((?:\\vec\{[A-Za-z0-9]+\}|[A-Za-z][_\^]\{[^{}]+\}|[A-Za-z][_\^][0-9a-zA-Z]|\\(?:alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|rho|sigma|tau|phi|psi|omega|Delta|Omega))\b(?:[_\^]\{[^{}]+\}|[_\^][0-9a-zA-Z])?)(?!\$)'
            )
            part = var_pattern.sub(r'$\1$', part)

            # Clean up redundant adjacent dollar signs
            part = re.sub(r'\$\s*([=><\+\-\*\/])\s*\$', r' \1 ', part)
            part = re.sub(r'\$\s*\$', '', part)

            result_parts.append(part)

        return ''.join(result_parts)
