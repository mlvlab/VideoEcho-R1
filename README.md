<div align="center">

# Reason in the Words You Speak: Idiolectal Paraphrasing Off-Policy Traces for Reasoning Distillation in VideoLLMs

[![arXiv](https://img.shields.io/badge/arXiv-2608.26684-b31b1b.svg)](https://arxiv.org/abs/2608.26684)
[![Project Page](https://img.shields.io/badge/Project-Page-1f6feb.svg)](https://mlv.kaist.ac.kr/VideoEcho-R1/)
[![NeurIPS 2026](https://img.shields.io/badge/NeurIPS-2026-6f42c1.svg)](https://neurips.cc/)

[**Ji&nbsp;Soo&nbsp;Lee**](https://simplewhite9.github.io/)<sup>1</sup>&nbsp;&nbsp; **Jinyoung&nbsp;Park**<sup>1</sup>&nbsp;&nbsp; **Seohyun&nbsp;Lee**<sup>1</sup>&nbsp;&nbsp; **Jongha&nbsp;Kim**<sup>2</sup>&nbsp;&nbsp; **Joonmyung&nbsp;Choi**<sup>2</sup>&nbsp;&nbsp; **Jinsung&nbsp;Yoon**<sup>3</sup>&nbsp;&nbsp; **Hyunwoo&nbsp;J.&nbsp;Kim**<sup>1</sup>

<sup>1</sup> KAIST &nbsp;&nbsp; <sup>2</sup>&nbsp;Korea&nbsp;University &nbsp;&nbsp; <sup>3</sup>&nbsp;Google&nbsp;Cloud&nbsp;AI&nbsp;Research

</div>

Official repository of **Echo-GRPO** and **VideoEcho-R1** (NeurIPS 2026).

Mixed-Policy GRPO injects a privileged reasoning trace from a stronger model into the rollout group, but trust-region clipping blocks the gradient of the very tokens that carry the reasoning. **Echo-GRPO** paraphrases the privileged trace into the student's own idiolect with **Dual-Reference Decoding**, so the trace stays inside the trust region and the reasoning, not only the answer, is learned.

## Code

**Coming soon.**

## Citation

```bibtex
@inproceedings{lee2026reason,
  title     = {Reason in the Words You Speak: Idiolectal Paraphrasing
               Off-Policy Traces for Reasoning Distillation in VideoLLMs},
  author    = {Lee, {Ji Soo} and Park, Jinyoung and Lee, Seohyun and Kim, Jongha
               and Choi, Joonmyung and Yoon, Jinsung and Kim, Hyunwoo J.},
  booktitle = {NeurIPS},
  year      = {2026}
}
```
